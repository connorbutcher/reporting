import { describe, expect, it } from 'vitest';
import { DatasetColumn, FormulaFunction, FormulaParameter, FormulaValueKind } from '../../../../core/models/dataset';
import {
  Expression,
  FormulaItem,
  columnBlock,
  functionBlock,
  groupBlock,
  literalBlock,
  operatorItem,
} from './formula-block';
import { analyzeFormula, checkFormula, kindOfExpression, scopeOf } from './formula-checker';
import { FormulaParseError, parseFormula } from './formula-parser';
import { foldRpn, toRpn } from './formula-rpn';
import { blockAtPosition, serializeFormula } from './formula-serializer';
import { addArgument, containsItem, expressionAt, findItem, insertItem, removeItem, updateItem } from './formula-tree';

const param = (name: string, kind: FormulaValueKind, extra: Partial<FormulaParameter> = {}): FormulaParameter => ({
  name,
  kind,
  isOptional: false,
  isVariadic: false,
  ...extra,
});

const fn = (name: string, returnKind: FormulaValueKind, ...parameters: FormulaParameter[]): FormulaFunction => ({
  name,
  category: 'math',
  description: '',
  example: '',
  returnKind,
  parameters,
});

const FUNCTIONS = [
  fn('ROUND', 'number', param('number', 'number'), param('digits', 'number', { isOptional: true })),
  fn('UPPER', 'text', param('text', 'text')),
  fn('IF', 'any', param('condition', 'bool'), param('then', 'any'), param('else', 'any')),
  fn('ISBLANK', 'bool', param('value', 'any')),
  fn('SUM', 'number', param('number', 'number', { isVariadic: true })),
  fn('DATEADD', 'date', param('unit', 'text'), param('amount', 'number'), param('date', 'date')),
];

const column = (name: string, type: DatasetColumn['type']): DatasetColumn => ({
  id: name,
  name,
  type,
  order: 0,
  configuration: { kind: 'text' },
});

const SCOPE = scopeOf(FUNCTIONS, [
  column('Qty', 'int'),
  column('Price', 'double'),
  column('Region', 'string'),
  column('Ordered', 'dateTime'),
  column('Shipped', 'bool'),
]);

const col = columnBlock;
const lit = literalBlock;
const op = operatorItem;
const call = (name: string, ...args: Expression[]): FormulaItem => functionBlock(SCOPE.functions.get(name), name, args);

const describe0 = () => ({ name: 'value', optional: false });
const write = (expression: Expression): string => serializeFormula(expression, describe0).text;
const text = (source: string): string => write(parseFormula(source, SCOPE.functions));

/** The reverse Polish form as readable text: operands by their column name or value, operators by their symbol. */
const rpn = (expression: Expression): string =>
  toRpn(expression)
    .tokens.map((token) => {
      if (token.type === 'missing') return '?';
      if (token.type === 'operator') return token.unary ? `${token.item.op}u` : token.item.op;
      const { item } = token;
      return item.kind === 'column' ? item.name : item.kind === 'literal' ? String(item.value) : item.kind;
    })
    .join(' ');

describe('toRpn (shunting-yard)', () => {
  it('orders operators by precedence, whatever order the user placed them in', () => {
    expect(rpn([col('Qty'), op('+'), col('Price'), op('*'), lit(2)])).toBe('Qty Price 2 * +');
    expect(rpn([col('Qty'), op('*'), col('Price'), op('+'), lit(2)])).toBe('Qty Price * 2 +');
  });

  it('groups equal-precedence operators to the left, except ^, which groups to the right', () => {
    expect(rpn([lit(8), op('-'), lit(3), op('-'), lit(2)])).toBe('8 3 - 2 -');
    expect(rpn([lit(2), op('^'), lit(3), op('^'), lit(2)])).toBe('2 3 2 ^ ^');
  });

  it('treats brackets as a single value, however low their contents bind', () => {
    expect(rpn([groupBlock([col('Qty'), op('+'), lit(1)]), op('*'), col('Price')])).toBe('group Price *');
  });

  it('reads a - with nothing before it as a negation, binding looser than ^ and tighter than *', () => {
    expect(rpn([op('-'), col('Qty')])).toBe('Qty -u');
    expect(rpn([lit(2), op('*'), op('-'), col('Qty')])).toBe('2 Qty -u *');
    expect(rpn([op('-'), lit(2), op('^'), lit(2)])).toBe('2 2 ^ -u');
    expect(rpn([lit(3), op('-'), op('-'), lit(2)])).toBe('3 2 -u -');
  });

  it('lets NOT take everything up to the next AND or OR, so comparisons are inside it', () => {
    expect(rpn([op('NOT'), col('Qty'), op('='), lit(1), op('AND'), col('Shipped')])).toBe('Qty 1 = NOTu Shipped AND');
  });

  it('puts OR loosest, then AND, then comparisons', () => {
    expect(rpn([col('Shipped'), op('OR'), col('Shipped'), op('AND'), col('Qty'), op('>'), lit(1)])).toBe('Shipped Shipped Qty 1 > AND OR');
  });

  it('reports an operator with no value beside it, and stands in a missing value so the result is still well formed', () => {
    const leading = toRpn([op('*'), col('Qty')]);
    expect(leading.issues.map((i) => i.message)).toEqual(['× needs a value on its left.']);
    expect(rpn([op('*'), col('Qty')])).toBe('? Qty *');

    const trailing = toRpn([col('Qty'), op('+')]);
    expect(trailing.issues.map((i) => i.message)).toEqual(['+ needs a value after it.']);
    expect(rpn([col('Qty'), op('+')])).toBe('Qty ? +');
  });

  it('reports two values with no operator between them, and two operators in a row', () => {
    const b = col('Price');
    expect(toRpn([col('Qty'), b]).issues).toEqual([{ blockId: b.id, message: 'Put an operator between this and the value before it.' }]);
    expect(toRpn([col('Qty'), op('+'), op('*'), col('Price')]).issues).toHaveLength(1);
  });

  it('will not chain comparisons', () => {
    const issues = toRpn([lit(1), op('<'), lit(2), op('<'), lit(3)]).issues;
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('another comparison');
  });

  it('keeps NOT to the front of a value', () => {
    expect(toRpn([col('Shipped'), op('NOT'), col('Shipped')]).issues.length).toBeGreaterThan(0);
  });

  it('says nothing about an empty expression', () => {
    expect(toRpn([])).toEqual({ tokens: [], issues: [] });
  });

  it('folds tokens on a stack, the reverse Polish way', () => {
    const stack = foldRpn<string>(toRpn([lit(1), op('+'), lit(2), op('*'), lit(3)]).tokens, {
      operand: (item) => (item.kind === 'literal' ? String(item.value) : '?'),
      missing: () => '?',
      unary: (o, a) => `(${o.op} ${a})`,
      binary: (o, l, r) => `(${l} ${o.op} ${r})`,
    });
    expect(stack).toEqual(['(1 + (2 * 3))']);
  });
});

describe('serializeFormula', () => {
  it('writes a sequence as infix text, with no brackets the shape does not need', () => {
    expect(write([col('Qty'), op('*'), col('Price'), op('+'), lit(1)])).toBe('[Qty] * [Price] + 1');
    expect(write([col('Qty'), op('+'), col('Price'), op('*'), lit(2)])).toBe('[Qty] + [Price] * 2');
  });

  it('keeps the brackets the user put in', () => {
    expect(write([groupBlock([col('Qty'), op('+'), lit(1)]), op('*'), col('Price')])).toBe('([Qty] + 1) * [Price]');
  });

  it('writes negations and NOT the way the server reads them', () => {
    expect(write([op('-'), col('Qty')])).toBe('-[Qty]');
    expect(write([lit(2), op('-'), op('-'), lit(3)])).toBe('2 - -3');
    expect(write([op('NOT'), col('Shipped'), op('AND'), col('Shipped')])).toBe('NOT [Shipped] AND [Shipped]');
    expect(write([op('-'), lit(2), op('^'), lit(2)])).toBe('-2 ^ 2');
  });

  it('brackets a negative number that is the base of a power', () => {
    expect(write([lit(-2), op('^'), lit(2)])).toBe('(-2) ^ 2');
  });

  it('lays a function out one argument per line once an argument is more than a plain value', () => {
    expect(text('ROUND([Qty], 2)')).toBe('ROUND([Qty], 2)');
    expect(text('IF(ISBLANK([Qty]), 0, ROUND([Qty] * [Price], 1))')).toBe(
      ['IF(', '  ISBLANK([Qty]),', '  0,', '  ROUND(', '    [Qty] * [Price],', '    1', '  )', ')'].join('\n'),
    );
  });

  it('marks an expression with a gap incomplete, and shows where', () => {
    const result = serializeFormula([col('Qty'), op('*')], describe0);
    expect(result.complete).toBe(false);
    expect(result.text).toBe('[Qty] * ‹value missing›');
    expect(result.segments.filter((s) => s.style === 'missing')).toHaveLength(1);
  });

  it('marks an empty function argument missing, but leaves out empty optional ones at the end', () => {
    const round = functionBlock(SCOPE.functions.get('ROUND'), 'ROUND', [[col('Qty')], []]);
    const optional = serializeFormula([round], (_, i) => ({ name: 'n', optional: i === 1 }));
    expect(optional.text).toBe('ROUND([Qty])');
    expect(optional.complete).toBe(true);

    const required = serializeFormula([round], (_, i) => ({ name: i === 0 ? 'number' : 'digits', optional: false }));
    expect(required.text).toBe('ROUND([Qty], ‹digits missing›)');
    expect(required.complete).toBe(false);
  });

  it('marks empty brackets missing', () => {
    expect(serializeFormula([groupBlock([])], describe0).text).toBe('(‹value missing›)');
  });

  it('records each item\'s span, so an error position finds the item that caused it', () => {
    const qty = col('Qty');
    const times = op('*');
    const price = col('Price');
    const round = functionBlock(SCOPE.functions.get('ROUND'), 'ROUND', [[qty, times, price], [lit(2)]]);
    const { text: written, spans } = serializeFormula([round], describe0);

    const at = (needle: string): number => written.indexOf(needle);
    expect(blockAtPosition(spans, at('[Price]'))).toBe(price.id);
    expect(blockAtPosition(spans, at('[Qty]'))).toBe(qty.id);
    expect(blockAtPosition(spans, at(' * '))).toBe(times.id);
    expect(blockAtPosition(spans, at('ROUND'))).toBe(round.id);
  });
});

describe('parseFormula', () => {
  it('reads text into the sequence the user would have laid out, and writes it back the same', () => {
    expect(text('[Qty] * [Price] + 1')).toBe('[Qty] * [Price] + 1');
    expect(text('ROUND(  [Qty]  ,2 )')).toBe('ROUND([Qty], 2)');
    expect(text('[Shipped] AND NOT [Shipped] OR [Shipped]')).toBe('[Shipped] AND NOT [Shipped] OR [Shipped]');
    expect(text('2 ^ 3 ^ 2')).toBe('2 ^ 3 ^ 2');
  });

  it('keeps brackets as groups', () => {
    const parsed = parseFormula('([Qty] + 1) * [Price]', SCOPE.functions);
    expect(parsed.map((i) => i.kind)).toEqual(['group', 'operator', 'column']);
    expect(text('([Qty] + 1) * [Price]')).toBe('([Qty] + 1) * [Price]');
  });

  it('reads AND, OR and NOT as operators, and a call like AND(a, b) as a function', () => {
    expect(parseFormula('[Shipped] AND NOT [Shipped]', SCOPE.functions).map((i) => (i.kind === 'operator' ? i.op : i.kind))).toEqual([
      'column',
      'AND',
      'NOT',
      'column',
    ]);
    expect(parseFormula('AND([Shipped], [Shipped])', SCOPE.functions)[0].kind).toBe('function');
  });

  it('escapes quotes in text and reads them back', () => {
    expect(text('UPPER("say ""hi""")')).toBe('UPPER("say ""hi""")');
  });

  it('keeps a leading minus as an operator in the sequence', () => {
    expect(text('-5')).toBe('-5');
    expect(text('-[Qty] * 2')).toBe('-[Qty] * 2');
    expect(parseFormula('-[Qty]', SCOPE.functions).map((i) => i.kind)).toEqual(['operator', 'column']);
  });

  it('pads a call to the arguments its function needs, so saved gaps show up as gaps', () => {
    const [call0] = parseFormula('DATEADD("day")', SCOPE.functions);
    expect(call0.kind === 'function' && call0.args).toHaveLength(3);
  });

  it('explains what it cannot read', () => {
    expect(() => parseFormula('ROUND([Qty]', SCOPE.functions)).toThrow(FormulaParseError);
    expect(() => parseFormula('Qty + 1', SCOPE.functions)).toThrow(/square brackets/);
    expect(() => parseFormula('"open', SCOPE.functions)).toThrow(/closing quote/);
    expect(() => parseFormula('(1 + 2', SCOPE.functions)).toThrow(/closing/);
  });

  it('reads nothing as an empty canvas', () => {
    expect(parseFormula('   ', SCOPE.functions)).toEqual([]);
  });
});

describe('analyzeFormula', () => {
  it('finds nothing wrong with a sound formula, however it was laid out', () => {
    const formula = [call('ROUND', [col('Qty'), op('*'), col('Price'), op('+'), lit(1)], [lit(2)])];
    expect(checkFormula(formula, SCOPE)).toEqual([]);
  });

  it('reports an empty required argument on the function, with its argument, and not an empty optional one', () => {
    const round = call('ROUND', [], []);
    const issues = checkFormula([round], SCOPE);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'missing', blockId: round.id, ownerId: round.id, arg: 0 });
    expect(issues[0].message).toContain('number');
  });

  it('reports an argument of the wrong kind on the value, and on the argument', () => {
    const region = col('Region');
    const round = call('ROUND', [region], []);
    const [issue] = checkFormula([round], SCOPE);

    expect(issue).toMatchObject({ kind: 'type', blockId: region.id, ownerId: round.id, arg: 0 });
    expect(issue.message).toBe('Number needs a number, but this is text.');
  });

  it('checks the kinds of what an operator sits between, from the stack', () => {
    const region = col('Region');
    const issues = checkFormula([region, op('*'), lit(2)], SCOPE);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'type', blockId: region.id });
    expect(issues[0].message).toBe('× needs a number, but this is text.');
  });

  it('checks an operator against the value that comes out of its neighbours, not only what is beside it', () => {
    // (Region & "x") is text, so multiplying it is wrong even though the group holds no number-typed item.
    const group = groupBlock([col('Region'), op('&'), lit('x')]);
    const issues = checkFormula([group, op('*'), lit(2)], SCOPE);
    expect(issues.map((i) => i.kind)).toEqual(['type']);
    expect(issues[0].blockId).toBe(group.id);
    // Without the brackets & binds looser than *, so this is Region & ("x" * 2): the multiplication is the wrong part.
    expect(checkFormula([col('Region'), op('&'), lit('x'), op('*'), lit(2)], SCOPE).map((i) => i.kind)).toEqual(['type']);
  });

  it('lets a comparison take any kind on both sides, but not two different kinds', () => {
    expect(checkFormula([col('Region'), op('='), lit('North')], SCOPE)).toEqual([]);
    const issues = checkFormula([col('Qty'), op('='), lit('x')], SCOPE);
    expect(issues[0].message).toBe("Can't compare a number with text.");
  });

  it('needs true/false around AND and OR, and after NOT', () => {
    expect(checkFormula([col('Shipped'), op('AND'), col('Shipped')], SCOPE)).toEqual([]);
    expect(checkFormula([col('Qty'), op('AND'), col('Shipped')], SCOPE).map((i) => i.kind)).toEqual(['type']);
    expect(checkFormula([op('NOT'), col('Qty')], SCOPE).map((i) => i.kind)).toEqual(['type']);
  });

  it('carries the sequence problems found by the conversion, on the item they are about', () => {
    const plus = op('+');
    const issues = checkFormula([col('Qty'), plus], SCOPE);
    expect(issues).toEqual([{ kind: 'structure', blockId: plus.id, message: '+ needs a value after it.' }]);
  });

  it('checks inside brackets and function arguments, and rejects empty brackets', () => {
    const group = groupBlock([]);
    expect(checkFormula([group], SCOPE).map((i) => i.message)).toEqual(['These brackets are empty.']);
    expect(checkFormula([groupBlock([col('Region'), op('*'), lit(2)])], SCOPE).map((i) => i.kind)).toEqual(['type']);
  });

  it('reports an unknown column and an unknown function', () => {
    const issues = checkFormula([functionBlock(undefined, 'NOPE', [[col('Gone')]])], SCOPE);
    expect(issues.map((i) => i.kind)).toEqual(['unknown', 'unknown']);
    expect(issues[0].message).toContain('NOPE');
    expect(issues[1].message).toContain('[Gone]');
  });

  it('asks for a repeating parameter once, not for its spare argument', () => {
    const issues = checkFormula([call('SUM', [], [])], SCOPE);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'missing', arg: 0 });
  });

  it('accepts a blank literal for any kind', () => {
    expect(checkFormula([call('ROUND', [lit(null)], [])], SCOPE)).toEqual([]);
  });

  it('says nothing about an empty formula', () => {
    expect(analyzeFormula([], SCOPE)).toEqual({ kind: 'any', issues: [] });
  });
});

describe('kindOfExpression', () => {
  it('follows a column, a value and the operators through the stack', () => {
    expect(kindOfExpression([col('Ordered')], SCOPE)).toBe('date');
    expect(kindOfExpression([lit('x')], SCOPE)).toBe('text');
    expect(kindOfExpression([col('Qty'), op('>'), lit(1)], SCOPE)).toBe('bool');
    expect(kindOfExpression([col('Qty'), op('*'), col('Price'), op('+'), lit(1)], SCOPE)).toBe('number');
    expect(kindOfExpression([col('Region'), op('&'), col('Qty')], SCOPE)).toBe('text');
    expect(kindOfExpression([groupBlock([col('Qty'), op('+'), lit(1)])], SCOPE)).toBe('number');
  });

  it('gives a function that returns whatever its any-arguments are their shared kind', () => {
    const cond = [col('Shipped')];
    expect(kindOfExpression([call('IF', cond, [lit(1)], [lit(2)])], SCOPE)).toBe('number');
    expect(kindOfExpression([call('IF', cond, [lit(1)], [lit('x')])], SCOPE)).toBe('any');
    expect(kindOfExpression([call('IF', cond, [lit(null)], [lit(2)])], SCOPE)).toBe('number');
  });
});

describe('formula tree operations', () => {
  it('inserts an item at a place in the root, without touching the original', () => {
    const root: Expression = [col('Qty'), col('Price')];
    const plus = op('+');

    const next = insertItem(root, { ownerId: null, arg: 0 }, 1, plus);

    expect(root).toHaveLength(2);
    expect(next.map((i) => i.id)).toEqual([root[0].id, plus.id, root[1].id]);
  });

  it('inserts into a function argument or a group, and shares what it did not change', () => {
    const round = call('ROUND', [], []);
    const other = col('Price');
    const root: Expression = [round, op('+'), other];
    const qty = col('Qty');

    const next = insertItem(root, { ownerId: round.id, arg: 0 }, 0, qty);

    expect(next[2]).toBe(other);
    expect(expressionAt(next, { ownerId: round.id, arg: 0 })).toEqual([qty]);

    const group = groupBlock([]);
    const grouped = insertItem([group], { ownerId: group.id, arg: 0 }, 0, lit(1));
    expect(expressionAt(grouped, { ownerId: group.id, arg: 0 })).toHaveLength(1);
  });

  it('finds an item anywhere and says which expression it is in', () => {
    const qty = col('Qty');
    const round = call('ROUND', [qty], []);
    const found = findItem([round], qty.id);

    expect(found?.address).toEqual({ ownerId: round.id, arg: 0 });
    expect(found?.index).toBe(0);
    expect(findItem([round], 9999)).toBeNull();
  });

  it('removes an item from wherever it is', () => {
    const qty = col('Qty');
    const round = call('ROUND', [qty], []);

    const next = removeItem([round], qty.id);

    expect(expressionAt(next, { ownerId: round.id, arg: 0 })).toEqual([]);
    expect(removeItem([round], round.id)).toEqual([]);
  });

  it('knows an item contains itself and what is inside it, but not a sibling', () => {
    const qty = col('Qty');
    const round = call('ROUND', [qty], []);
    const price = col('Price');

    expect(containsItem(round, qty.id)).toBe(true);
    expect(containsItem(round, round.id)).toBe(true);
    expect(containsItem(round, price.id)).toBe(false);
  });

  it('updates an item in place', () => {
    const value = lit(1);
    const next = updateItem([col('Qty'), value], value.id, (item) => ({ ...item, value: 5 }) as FormulaItem);
    expect(next[1]).toMatchObject({ kind: 'literal', value: 5 });
  });

  it('adds an argument to a function', () => {
    const sum = call('SUM', [], []);
    const next = addArgument([sum], sum.id);
    expect(next[0].kind === 'function' && next[0].args).toHaveLength(3);
  });
});

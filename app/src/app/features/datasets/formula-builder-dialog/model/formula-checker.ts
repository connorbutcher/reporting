import { DatasetColumn, FormulaFunction, FormulaValueKind } from '../../../../core/models/dataset';
import {
  Expression,
  FunctionBlock,
  KIND_LABELS,
  OperandItem,
  OperatorItem,
  columnTypeKind,
  operatorDefinition,
  operatorSymbol,
  parameterFor,
  slotIsOptional,
} from './formula-block';
import { foldRpn, toRpn } from './formula-rpn';

/** What a checker needs to know: the callable functions and the columns a formula may read. */
export interface FormulaScope {
  /** Keyed by upper-case name. */
  functions: ReadonlyMap<string, FormulaFunction>;
  /** Keyed by lower-case name. */
  columns: ReadonlyMap<string, DatasetColumn>;
}

/**
 * - `missing`: a function argument that needs a value and is empty.
 * - `structure`: items that don't fit together — an operator without a value beside it, two values with no operator between.
 * - `type`: a value of the wrong kind for the operator or parameter it feeds.
 * - `unknown`: a column or function that isn't there.
 * - `server`: found by the server's own check.
 */
export type FormulaIssueKind = 'missing' | 'structure' | 'type' | 'unknown' | 'server';

/**
 * A problem, on the item it is about. One about a function's argument as a whole — an empty required one,
 * or a value of the wrong kind — also names the function and argument (`ownerId`, `arg`), so it can be
 * shown on that argument's row.
 */
export interface FormulaIssue {
  kind: FormulaIssueKind;
  blockId: number;
  message: string;
  ownerId?: number;
  arg?: number;
}

export interface FormulaAnalysis {
  /** The kind of value the formula produces; `any` when it can't be told, or there is no formula. */
  kind: FormulaValueKind;
  issues: FormulaIssue[];
}

/** A value's kind, and the first item of it in reading order, which is where a problem with it is pointed. */
interface Typed {
  kind: FormulaValueKind;
  first: number;
}

export function scopeOf(functions: readonly FormulaFunction[], columns: readonly DatasetColumn[]): FormulaScope {
  return {
    functions: new Map(functions.map((f) => [f.name.toUpperCase(), f])),
    columns: new Map(columns.map((c) => [c.name.toLowerCase(), c])),
  };
}

/**
 * Checks a formula without the server. Each expression is put into reverse Polish notation, so a gap or a
 * doubled-up operator is found by the conversion itself, and then evaluated on a stack of *kinds* rather
 * than values: an operator pops the kinds of what it applies to and checks them, pushing the kind it
 * yields. What that finds — empty required arguments, wrong kinds, unknown columns and functions — is
 * what the user sees on the blocks; the server is still asked afterwards, for its own verdict.
 */
export function analyzeFormula(root: Expression, scope: FormulaScope): FormulaAnalysis {
  const issues: FormulaIssue[] = [];
  const typed = analyzeExpression(root, scope, issues);
  return { kind: typed?.kind ?? 'any', issues };
}

export function checkFormula(root: Expression, scope: FormulaScope): FormulaIssue[] {
  return analyzeFormula(root, scope).issues;
}

/** The kind of value an expression produces (issues found on the way are discarded). */
export function kindOfExpression(expression: Expression, scope: FormulaScope): FormulaValueKind {
  return analyzeExpression(expression, scope, [])?.kind ?? 'any';
}

/** The parameters of a function block, from the catalogue (empty when it isn't there). */
export function parametersOf(block: FunctionBlock, scope: FormulaScope): readonly FormulaFunction['parameters'][number][] {
  return scope.functions.get(block.name.toUpperCase())?.parameters ?? [];
}

function analyzeExpression(expression: Expression, scope: FormulaScope, issues: FormulaIssue[]): Typed | null {
  if (expression.length === 0) return null;

  const rpn = toRpn(expression);
  for (const issue of rpn.issues) issues.push({ kind: 'structure', blockId: issue.blockId, message: issue.message });

  const stack = foldRpn<Typed>(rpn.tokens, {
    operand: (item) => analyzeOperand(item, scope, issues),
    missing: (operatorId) => ({ kind: 'any', first: operatorId ?? 0 }),
    unary: (operator, argument) => applyOperator(operator, [argument], issues, argument.first),
    binary: (operator, left, right) => applyOperator(operator, [left, right], issues, left.first),
  });
  return stack[0] ?? null;
}

function analyzeOperand(item: OperandItem, scope: FormulaScope, issues: FormulaIssue[]): Typed {
  switch (item.kind) {
    case 'column': {
      const column = scope.columns.get(item.name.toLowerCase());
      if (!column) issues.push({ kind: 'unknown', blockId: item.id, message: `There's no column named [${item.name}].` });
      return { kind: column ? columnTypeKind(column.type) : 'any', first: item.id };
    }
    case 'literal':
      return {
        kind: item.value === null ? 'any' : typeof item.value === 'number' ? 'number' : typeof item.value === 'boolean' ? 'bool' : 'text',
        first: item.id,
      };
    case 'group': {
      if (item.body.length === 0) issues.push({ kind: 'structure', blockId: item.id, message: 'These brackets are empty.' });
      const inner = analyzeExpression(item.body, scope, issues);
      return { kind: inner?.kind ?? 'any', first: item.id };
    }
    case 'function':
      return { kind: analyzeCall(item, scope, issues), first: item.id };
  }
}

/** Checks the operands of an operator against what it takes, and gives the kind it produces. */
function applyOperator(operator: OperatorItem, operands: Typed[], issues: FormulaIssue[], first: number): Typed {
  const definition = operatorDefinition(operator.op);
  const symbol = operatorSymbol(operator.op);
  if (!definition) return { kind: 'any', first };

  if (definition.operandKind !== 'any') {
    for (const operand of operands) {
      if (operand.kind !== 'any' && operand.kind !== definition.operandKind) {
        issues.push({
          kind: 'type',
          blockId: operand.first,
          message: `${symbol} needs ${KIND_LABELS[definition.operandKind]}, but this is ${KIND_LABELS[operand.kind]}.`,
        });
      }
    }
  } else if (operands.length === 2 && definition.returnKind === 'bool') {
    // Comparisons: both sides the same kind, and only ordered kinds for < >.
    const [left, right] = operands;
    if (left.kind !== 'any' && right.kind !== 'any' && left.kind !== right.kind) {
      issues.push({
        kind: 'type',
        blockId: right.first,
        message: `Can't compare ${KIND_LABELS[left.kind]} with ${KIND_LABELS[right.kind]}.`,
      });
    } else if (['<', '<=', '>', '>='].includes(operator.op) && (left.kind === 'bool' || right.kind === 'bool')) {
      issues.push({ kind: 'type', blockId: right.first, message: `${symbol} can't order true/false values.` });
    }
  }

  return { kind: definition.returnKind, first };
}

function analyzeCall(call: FunctionBlock, scope: FormulaScope, issues: FormulaIssue[]): FormulaValueKind {
  const fn = scope.functions.get(call.name.toUpperCase());
  if (!fn) issues.push({ kind: 'unknown', blockId: call.id, message: `There's no function named ${call.name}.` });
  const params = fn?.parameters ?? [];

  const argumentKinds: (Typed | null)[] = [];
  call.args.forEach((expression, index) => {
    const param = params.length ? parameterFor(params, index) : null;

    if (expression.length === 0) {
      if (param && !slotIsOptional(params, index)) {
        issues.push({
          kind: 'missing',
          blockId: call.id,
          ownerId: call.id,
          arg: index,
          message: `Add a value for ${param.name} in ${call.name}().`,
        });
      }
      argumentKinds.push(null);
      return;
    }

    const typed = analyzeExpression(expression, scope, issues);
    argumentKinds.push(typed);
    if (param && typed && param.kind !== 'any' && typed.kind !== 'any' && typed.kind !== param.kind) {
      issues.push({
        kind: 'type',
        blockId: typed.first,
        ownerId: call.id,
        arg: index,
        message: `${capitalise(param.name)} needs ${KIND_LABELS[param.kind]}, but this is ${KIND_LABELS[typed.kind]}.`,
      });
    }
  });

  if (!fn) return 'any';
  return fn.returnKind === 'any' ? commonKind(call, fn, argumentKinds) : fn.returnKind;
}

/** For a function that returns whatever its `any` arguments are (IF, COALESCE): their shared kind, or `any` if they differ. */
function commonKind(call: FunctionBlock, fn: FormulaFunction, kinds: (Typed | null)[]): FormulaValueKind {
  let common: FormulaValueKind | null = null;
  kinds.forEach((typed, index) => {
    if (common === 'any' || !typed || parameterFor(fn.parameters, index).kind !== 'any') return;
    const expression = call.args[index];
    if (expression.length === 1 && expression[0].kind === 'literal' && expression[0].value === null) return;
    if (typed.kind === 'any') return;
    common = common === null || common === typed.kind ? typed.kind : 'any';
  });
  return common ?? 'any';
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

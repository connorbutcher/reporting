import { describe, expect, it } from 'vitest';
import { RpnFolder } from './rpn-folder';
import { foldRpn } from './fold-rpn';
import { toRpn } from './to-rpn';
import { groupBlock } from '../factory/item-factory';
import { col, lit, op } from '../testing/test-items';
import { rpnText } from '../testing/test-text';

describe('toRpn (shunting-yard)', () => {
  it('orders operators by precedence, whatever order the user placed them in', () => {
    expect(rpnText([col('Qty'), op('+'), col('Price'), op('*'), lit(2)])).toBe('Qty Price 2 * +');
    expect(rpnText([col('Qty'), op('*'), col('Price'), op('+'), lit(2)])).toBe('Qty Price * 2 +');
  });

  it('groups equal-precedence operators to the left, except ^, which groups to the right', () => {
    expect(rpnText([lit(8), op('-'), lit(3), op('-'), lit(2)])).toBe('8 3 - 2 -');
    expect(rpnText([lit(2), op('^'), lit(3), op('^'), lit(2)])).toBe('2 3 2 ^ ^');
  });

  it('treats brackets as a single value, however low their contents bind', () => {
    expect(rpnText([groupBlock([col('Qty'), op('+'), lit(1)]), op('*'), col('Price')])).toBe('group Price *');
  });

  it('reads a - with nothing before it as a negation, binding looser than ^ and tighter than *', () => {
    expect(rpnText([op('-'), col('Qty')])).toBe('Qty -u');
    expect(rpnText([lit(2), op('*'), op('-'), col('Qty')])).toBe('2 Qty -u *');
    expect(rpnText([op('-'), lit(2), op('^'), lit(2)])).toBe('2 2 ^ -u');
    expect(rpnText([lit(3), op('-'), op('-'), lit(2)])).toBe('3 2 -u -');
  });

  it('lets NOT take everything up to the next AND or OR, so comparisons are inside it', () => {
    expect(rpnText([op('NOT'), col('Qty'), op('='), lit(1), op('AND'), col('Shipped')])).toBe('Qty 1 = NOTu Shipped AND');
  });

  it('puts OR loosest, then AND, then comparisons', () => {
    expect(rpnText([col('Shipped'), op('OR'), col('Shipped'), op('AND'), col('Qty'), op('>'), lit(1)])).toBe('Shipped Shipped Qty 1 > AND OR');
  });

  it('reports an operator with no value beside it, and stands in a missing value so the result is still well formed', () => {
    const leading = toRpn([op('*'), col('Qty')]);
    expect(leading.issues.map((i) => i.message)).toEqual(['× needs a value on its left.']);
    expect(rpnText([op('*'), col('Qty')])).toBe('? Qty *');

    const trailing = toRpn([col('Qty'), op('+')]);
    expect(trailing.issues.map((i) => i.message)).toEqual(['+ needs a value after it.']);
    expect(rpnText([col('Qty'), op('+')])).toBe('Qty ? +');
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
    const folder: RpnFolder<string> = {
      operand(item) {
        return item.kind === 'literal' ? String(item.value) : '?';
      },
      missing() {
        return '?';
      },
      unary(operator, argument) {
        return `(${operator.op} ${argument})`;
      },
      binary(operator, left, right) {
        return `(${left} ${operator.op} ${right})`;
      },
    };

    const stack = foldRpn<string>(toRpn([lit(1), op('+'), lit(2), op('*'), lit(3)]).tokens, folder);
    expect(stack).toEqual(['(1 + (2 * 3))']);
  });
});

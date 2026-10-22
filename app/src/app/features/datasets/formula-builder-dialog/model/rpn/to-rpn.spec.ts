import { describe, expect, it } from 'vitest';
import { RpnFolder } from './rpn-folder';
import { RpnConversion } from './rpn-conversion';
import { ItemFactory } from '../factory/item-factory';
import { TestItems } from '../testing/test-items';
import { TestText } from '../testing/test-text';

describe('toRpn (shunting-yard)', () => {
  it('orders operators by precedence, whatever order the user placed them in', () => {
    expect(
      TestText.rpnText([
        TestItems.col('Qty'),
        TestItems.op('+'),
        TestItems.col('Price'),
        TestItems.op('*'),
        TestItems.lit(2),
      ]),
    ).toBe('Qty Price 2 * +');
    expect(
      TestText.rpnText([
        TestItems.col('Qty'),
        TestItems.op('*'),
        TestItems.col('Price'),
        TestItems.op('+'),
        TestItems.lit(2),
      ]),
    ).toBe('Qty Price * 2 +');
  });

  it('groups equal-precedence operators to the left, except ^, which groups to the right', () => {
    expect(
      TestText.rpnText([
        TestItems.lit(8),
        TestItems.op('-'),
        TestItems.lit(3),
        TestItems.op('-'),
        TestItems.lit(2),
      ]),
    ).toBe('8 3 - 2 -');
    expect(
      TestText.rpnText([
        TestItems.lit(2),
        TestItems.op('^'),
        TestItems.lit(3),
        TestItems.op('^'),
        TestItems.lit(2),
      ]),
    ).toBe('2 3 2 ^ ^');
  });

  it('treats brackets as a single value, however low their contents bind', () => {
    expect(
      TestText.rpnText([
        ItemFactory.group([TestItems.col('Qty'), TestItems.op('+'), TestItems.lit(1)]),
        TestItems.op('*'),
        TestItems.col('Price'),
      ]),
    ).toBe('group Price *');
  });

  it('reads a - with nothing before it as a negation, binding looser than ^ and tighter than *', () => {
    expect(TestText.rpnText([TestItems.op('-'), TestItems.col('Qty')])).toBe('Qty -u');
    expect(
      TestText.rpnText([
        TestItems.lit(2),
        TestItems.op('*'),
        TestItems.op('-'),
        TestItems.col('Qty'),
      ]),
    ).toBe('2 Qty -u *');
    expect(
      TestText.rpnText([TestItems.op('-'), TestItems.lit(2), TestItems.op('^'), TestItems.lit(2)]),
    ).toBe('2 2 ^ -u');
    expect(
      TestText.rpnText([TestItems.lit(3), TestItems.op('-'), TestItems.op('-'), TestItems.lit(2)]),
    ).toBe('3 2 -u -');
  });

  it('lets NOT take everything up to the next AND or OR, so comparisons are inside it', () => {
    expect(
      TestText.rpnText([
        TestItems.op('NOT'),
        TestItems.col('Qty'),
        TestItems.op('='),
        TestItems.lit(1),
        TestItems.op('AND'),
        TestItems.col('Shipped'),
      ]),
    ).toBe('Qty 1 = NOTu Shipped AND');
  });

  it('puts OR loosest, then AND, then comparisons', () => {
    expect(
      TestText.rpnText([
        TestItems.col('Shipped'),
        TestItems.op('OR'),
        TestItems.col('Shipped'),
        TestItems.op('AND'),
        TestItems.col('Qty'),
        TestItems.op('>'),
        TestItems.lit(1),
      ]),
    ).toBe('Shipped Shipped Qty 1 > AND OR');
  });

  it('reports an operator with no value beside it, and stands in a missing value so the result is still well formed', () => {
    const leading = RpnConversion.of([TestItems.op('*'), TestItems.col('Qty')]);
    expect(leading.issues.map((i) => i.message)).toEqual(['× needs a value on its left.']);
    expect(TestText.rpnText([TestItems.op('*'), TestItems.col('Qty')])).toBe('? Qty *');

    const trailing = RpnConversion.of([TestItems.col('Qty'), TestItems.op('+')]);
    expect(trailing.issues.map((i) => i.message)).toEqual(['+ needs a value after it.']);
    expect(TestText.rpnText([TestItems.col('Qty'), TestItems.op('+')])).toBe('Qty ? +');
  });

  it('reports two values with no operator between them, and two operators in a row', () => {
    const b = TestItems.col('Price');
    expect(RpnConversion.of([TestItems.col('Qty'), b]).issues).toEqual([
      { blockId: b.id, message: 'Put an operator between this and the value before it.' },
    ]);
    expect(
      RpnConversion.of([
        TestItems.col('Qty'),
        TestItems.op('+'),
        TestItems.op('*'),
        TestItems.col('Price'),
      ]).issues,
    ).toHaveLength(1);
  });

  it('will not chain comparisons', () => {
    const issues = RpnConversion.of([
      TestItems.lit(1),
      TestItems.op('<'),
      TestItems.lit(2),
      TestItems.op('<'),
      TestItems.lit(3),
    ]).issues;
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('another comparison');
  });

  it('keeps NOT to the front of a value', () => {
    expect(
      RpnConversion.of([TestItems.col('Shipped'), TestItems.op('NOT'), TestItems.col('Shipped')])
        .issues.length,
    ).toBeGreaterThan(0);
  });

  it('says nothing about an empty expression', () => {
    expect(RpnConversion.of([])).toEqual({ tokens: [], issues: [] });
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

    const stack = RpnConversion.fold<string>(
      RpnConversion.of([
        TestItems.lit(1),
        TestItems.op('+'),
        TestItems.lit(2),
        TestItems.op('*'),
        TestItems.lit(3),
      ]).tokens,
      folder,
    );
    expect(stack).toEqual(['(1 + (2 * 3))']);
  });
});

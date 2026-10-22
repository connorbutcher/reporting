import { describe, expect, it } from 'vitest';
import { ItemFactory } from '../factory/item-factory';
import { TestCatalogue } from '../testing/test-catalogue';
import { TestItems } from '../testing/test-items';
import { FormulaChecker } from './formula-checker';

describe('kindOfExpression', () => {
  it('follows a column, a value and the operators through the stack', () => {
    expect(FormulaChecker.kindOf([TestItems.col('Ordered')], TestCatalogue.SCOPE)).toBe('date');
    expect(FormulaChecker.kindOf([TestItems.lit('x')], TestCatalogue.SCOPE)).toBe('text');
    expect(
      FormulaChecker.kindOf(
        [TestItems.col('Qty'), TestItems.op('>'), TestItems.lit(1)],
        TestCatalogue.SCOPE,
      ),
    ).toBe('bool');
    expect(
      FormulaChecker.kindOf(
        [
          TestItems.col('Qty'),
          TestItems.op('*'),
          TestItems.col('Price'),
          TestItems.op('+'),
          TestItems.lit(1),
        ],
        TestCatalogue.SCOPE,
      ),
    ).toBe('number');
    expect(
      FormulaChecker.kindOf(
        [TestItems.col('Region'), TestItems.op('&'), TestItems.col('Qty')],
        TestCatalogue.SCOPE,
      ),
    ).toBe('text');
    expect(
      FormulaChecker.kindOf(
        [ItemFactory.group([TestItems.col('Qty'), TestItems.op('+'), TestItems.lit(1)])],
        TestCatalogue.SCOPE,
      ),
    ).toBe('number');
  });

  it('gives a function that returns whatever its any-arguments are their shared kind', () => {
    const cond = [TestItems.col('Shipped')];
    expect(
      FormulaChecker.kindOf(
        [TestItems.call('IF', cond, [TestItems.lit(1)], [TestItems.lit(2)])],
        TestCatalogue.SCOPE,
      ),
    ).toBe('number');
    expect(
      FormulaChecker.kindOf(
        [TestItems.call('IF', cond, [TestItems.lit(1)], [TestItems.lit('x')])],
        TestCatalogue.SCOPE,
      ),
    ).toBe('any');
    expect(
      FormulaChecker.kindOf(
        [TestItems.call('IF', cond, [TestItems.lit(null)], [TestItems.lit(2)])],
        TestCatalogue.SCOPE,
      ),
    ).toBe('number');
  });
});

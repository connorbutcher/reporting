import { describe, expect, it } from 'vitest';
import { groupBlock } from '../factory/item-factory';
import { SCOPE } from '../testing/test-catalogue';
import { call, col, lit, op } from '../testing/test-items';
import { kindOfExpression } from './analyze-formula';

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

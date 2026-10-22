import { describe, expect, it } from 'vitest';
import { TestCatalogue } from '../testing/test-catalogue';
import { FormulaParameters } from './formula-parameters';

describe('argumentForWrap', () => {
  it('chooses the argument a wrapped selection fills by the kind it produces', () => {
    const IF = TestCatalogue.SCOPE.functions.get('IF')!;
    const DATEADD = TestCatalogue.SCOPE.functions.get('DATEADD')!;
    expect(FormulaParameters.argumentForWrap(IF, 'bool')).toBe(0); // the condition
    expect(FormulaParameters.argumentForWrap(IF, 'number')).toBe(1); // condition wants true/false, so the first that takes a number
    expect(FormulaParameters.argumentForWrap(DATEADD, 'date')).toBe(2); // unit is text, amount a number, date is the third
    expect(FormulaParameters.argumentForWrap(DATEADD, 'any')).toBe(0);
    expect(
      FormulaParameters.argumentForWrap(TestCatalogue.SCOPE.functions.get('ROUND')!, 'text'),
    ).toBe(0); // nothing fits: the first, and the checker will say so
  });
});

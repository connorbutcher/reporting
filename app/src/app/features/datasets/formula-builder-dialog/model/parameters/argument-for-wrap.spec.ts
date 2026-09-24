import { describe, expect, it } from 'vitest';
import { SCOPE } from '../testing/test-catalogue';
import { argumentForWrap } from './argument-for-wrap';

describe('argumentForWrap', () => {
  it('chooses the argument a wrapped selection fills by the kind it produces', () => {
    const IF = SCOPE.functions.get('IF')!;
    const DATEADD = SCOPE.functions.get('DATEADD')!;
    expect(argumentForWrap(IF, 'bool')).toBe(0); // the condition
    expect(argumentForWrap(IF, 'number')).toBe(1); // condition wants true/false, so the first that takes a number
    expect(argumentForWrap(DATEADD, 'date')).toBe(2); // unit is text, amount a number, date is the third
    expect(argumentForWrap(DATEADD, 'any')).toBe(0);
    expect(argumentForWrap(SCOPE.functions.get('ROUND')!, 'text')).toBe(0); // nothing fits: the first, and the checker will say so
  });
});

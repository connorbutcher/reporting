import { describe, expect, it } from 'vitest';
import { SCOPE } from '../testing/test-catalogue';
import { roundTrip } from '../testing/test-text';
import { FormulaParseError } from './formula-parse-error';
import { parseFormula } from './parse-formula';

describe('parseFormula', () => {
  it('reads text into the sequence the user would have laid out, and writes it back the same', () => {
    expect(roundTrip('[Qty] * [Price] + 1')).toBe('[Qty] * [Price] + 1');
    expect(roundTrip('ROUND(  [Qty]  ,2 )')).toBe('ROUND([Qty], 2)');
    expect(roundTrip('[Shipped] AND NOT [Shipped] OR [Shipped]')).toBe('[Shipped] AND NOT [Shipped] OR [Shipped]');
    expect(roundTrip('2 ^ 3 ^ 2')).toBe('2 ^ 3 ^ 2');
  });

  it('keeps brackets as groups', () => {
    const parsed = parseFormula('([Qty] + 1) * [Price]', SCOPE.functions);
    expect(parsed.map((i) => i.kind)).toEqual(['group', 'operator', 'column']);
    expect(roundTrip('([Qty] + 1) * [Price]')).toBe('([Qty] + 1) * [Price]');
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
    expect(roundTrip('UPPER("say ""hi""")')).toBe('UPPER("say ""hi""")');
  });

  it('keeps a leading minus as an operator in the sequence', () => {
    expect(roundTrip('-5')).toBe('-5');
    expect(roundTrip('-[Qty] * 2')).toBe('-[Qty] * 2');
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

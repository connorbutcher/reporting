import { describe, expect, it } from 'vitest';
import { TestCatalogue } from '../testing/test-catalogue';
import { TestText } from '../testing/test-text';
import { FormulaParseError } from './formula-parse-error';
import { FormulaParser } from './formula-parser';

describe('parseFormula', () => {
  it('reads text into the sequence the user would have laid out, and writes it back the same', () => {
    expect(TestText.roundTrip('[Qty] * [Price] + 1')).toBe('[Qty] * [Price] + 1');
    expect(TestText.roundTrip('ROUND(  [Qty]  ,2 )')).toBe('ROUND([Qty], 2)');
    expect(TestText.roundTrip('[Shipped] AND NOT [Shipped] OR [Shipped]')).toBe(
      '[Shipped] AND NOT [Shipped] OR [Shipped]',
    );
    expect(TestText.roundTrip('2 ^ 3 ^ 2')).toBe('2 ^ 3 ^ 2');
  });

  it('keeps brackets as groups', () => {
    const parsed = FormulaParser.fromText('([Qty] + 1) * [Price]', TestCatalogue.SCOPE.functions);
    expect(parsed.map((i) => i.kind)).toEqual(['group', 'operator', 'column']);
    expect(TestText.roundTrip('([Qty] + 1) * [Price]')).toBe('([Qty] + 1) * [Price]');
  });

  it('reads AND, OR and NOT as operators, and a call like AND(a, b) as a function', () => {
    expect(
      FormulaParser.fromText('[Shipped] AND NOT [Shipped]', TestCatalogue.SCOPE.functions).map(
        (i) => (i.kind === 'operator' ? i.op : i.kind),
      ),
    ).toEqual(['column', 'AND', 'NOT', 'column']);
    expect(
      FormulaParser.fromText('AND([Shipped], [Shipped])', TestCatalogue.SCOPE.functions)[0].kind,
    ).toBe('function');
  });

  it('escapes quotes in text and reads them back', () => {
    expect(TestText.roundTrip('UPPER("say ""hi""")')).toBe('UPPER("say ""hi""")');
  });

  it('keeps a leading minus as an operator in the sequence', () => {
    expect(TestText.roundTrip('-5')).toBe('-5');
    expect(TestText.roundTrip('-[Qty] * 2')).toBe('-[Qty] * 2');
    expect(
      FormulaParser.fromText('-[Qty]', TestCatalogue.SCOPE.functions).map((i) => i.kind),
    ).toEqual(['operator', 'column']);
  });

  it('pads a call to the arguments its function needs, so saved gaps show up as gaps', () => {
    const [call0] = FormulaParser.fromText('DATEADD("day")', TestCatalogue.SCOPE.functions);
    expect(call0.kind === 'function' && call0.args).toHaveLength(3);
  });

  it('explains what it cannot read', () => {
    expect(() => FormulaParser.fromText('ROUND([Qty]', TestCatalogue.SCOPE.functions)).toThrow(
      FormulaParseError,
    );
    expect(() => FormulaParser.fromText('Qty + 1', TestCatalogue.SCOPE.functions)).toThrow(
      /square brackets/,
    );
    expect(() => FormulaParser.fromText('"open', TestCatalogue.SCOPE.functions)).toThrow(
      /closing quote/,
    );
    expect(() => FormulaParser.fromText('(1 + 2', TestCatalogue.SCOPE.functions)).toThrow(
      /closing/,
    );
  });

  it('reads nothing as an empty canvas', () => {
    expect(FormulaParser.fromText('   ', TestCatalogue.SCOPE.functions)).toEqual([]);
  });
});

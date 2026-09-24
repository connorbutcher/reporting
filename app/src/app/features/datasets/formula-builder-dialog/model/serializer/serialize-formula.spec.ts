import { describe, expect, it } from 'vitest';
import { functionBlock, groupBlock } from '../factory/item-factory';
import { SCOPE } from '../testing/test-catalogue';
import { col, lit, op } from '../testing/test-items';
import { describeAnyValue, roundTrip, write } from '../testing/test-text';
import { blockAtPosition } from './block-at-position';
import { serializeFormula } from './serialize-formula';

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
    expect(roundTrip('ROUND([Qty], 2)')).toBe('ROUND([Qty], 2)');
    expect(roundTrip('IF(ISBLANK([Qty]), 0, ROUND([Qty] * [Price], 1))')).toBe(
      ['IF(', '  ISBLANK([Qty]),', '  0,', '  ROUND(', '    [Qty] * [Price],', '    1', '  )', ')'].join('\n'),
    );
  });

  it('marks an expression with a gap incomplete, and shows where', () => {
    const result = serializeFormula([col('Qty'), op('*')], describeAnyValue);
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
    expect(serializeFormula([groupBlock([])], describeAnyValue).text).toBe('(‹value missing›)');
  });

  it('records each item\'s span, so an error position finds the item that caused it', () => {
    const qty = col('Qty');
    const times = op('*');
    const price = col('Price');
    const round = functionBlock(SCOPE.functions.get('ROUND'), 'ROUND', [[qty, times, price], [lit(2)]]);
    const { text: written, spans } = serializeFormula([round], describeAnyValue);

    const at = (needle: string): number => written.indexOf(needle);
    expect(blockAtPosition(spans, at('[Price]'))).toBe(price.id);
    expect(blockAtPosition(spans, at('[Qty]'))).toBe(qty.id);
    expect(blockAtPosition(spans, at(' * '))).toBe(times.id);
    expect(blockAtPosition(spans, at('ROUND'))).toBe(round.id);
  });
});

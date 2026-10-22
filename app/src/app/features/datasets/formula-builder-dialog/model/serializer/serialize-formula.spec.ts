import { describe, expect, it } from 'vitest';
import { ItemFactory } from '../factory/item-factory';
import { TestCatalogue } from '../testing/test-catalogue';
import { TestItems } from '../testing/test-items';
import { TestText } from '../testing/test-text';
import { FormulaSerializer } from './formula-serializer';

describe('serializeFormula', () => {
  it('writes a sequence as infix text, with no brackets the shape does not need', () => {
    expect(
      TestText.write([
        TestItems.col('Qty'),
        TestItems.op('*'),
        TestItems.col('Price'),
        TestItems.op('+'),
        TestItems.lit(1),
      ]),
    ).toBe('[Qty] * [Price] + 1');
    expect(
      TestText.write([
        TestItems.col('Qty'),
        TestItems.op('+'),
        TestItems.col('Price'),
        TestItems.op('*'),
        TestItems.lit(2),
      ]),
    ).toBe('[Qty] + [Price] * 2');
  });

  it('keeps the brackets the user put in', () => {
    expect(
      TestText.write([
        ItemFactory.group([TestItems.col('Qty'), TestItems.op('+'), TestItems.lit(1)]),
        TestItems.op('*'),
        TestItems.col('Price'),
      ]),
    ).toBe('([Qty] + 1) * [Price]');
  });

  it('writes negations and NOT the way the server reads them', () => {
    expect(TestText.write([TestItems.op('-'), TestItems.col('Qty')])).toBe('-[Qty]');
    expect(
      TestText.write([TestItems.lit(2), TestItems.op('-'), TestItems.op('-'), TestItems.lit(3)]),
    ).toBe('2 - -3');
    expect(
      TestText.write([
        TestItems.op('NOT'),
        TestItems.col('Shipped'),
        TestItems.op('AND'),
        TestItems.col('Shipped'),
      ]),
    ).toBe('NOT [Shipped] AND [Shipped]');
    expect(
      TestText.write([TestItems.op('-'), TestItems.lit(2), TestItems.op('^'), TestItems.lit(2)]),
    ).toBe('-2 ^ 2');
  });

  it('brackets a negative number that is the base of a power', () => {
    expect(TestText.write([TestItems.lit(-2), TestItems.op('^'), TestItems.lit(2)])).toBe(
      '(-2) ^ 2',
    );
  });

  it('lays a function out one argument per line once an argument is more than a plain value', () => {
    expect(TestText.roundTrip('ROUND([Qty], 2)')).toBe('ROUND([Qty], 2)');
    expect(TestText.roundTrip('IF(ISBLANK([Qty]), 0, ROUND([Qty] * [Price], 1))')).toBe(
      [
        'IF(',
        '  ISBLANK([Qty]),',
        '  0,',
        '  ROUND(',
        '    [Qty] * [Price],',
        '    1',
        '  )',
        ')',
      ].join('\n'),
    );
  });

  it('marks an expression with a gap incomplete, and shows where', () => {
    const result = FormulaSerializer.serialize(
      [TestItems.col('Qty'), TestItems.op('*')],
      TestText.describeAnyValue,
    );
    expect(result.complete).toBe(false);
    expect(result.text).toBe('[Qty] * ‹value missing›');
    expect(result.segments.filter((s) => s.style === 'missing')).toHaveLength(1);
  });

  it('marks an empty function argument missing, but leaves out empty optional ones at the end', () => {
    const round = ItemFactory.function(TestCatalogue.SCOPE.functions.get('ROUND'), 'ROUND', [
      [TestItems.col('Qty')],
      [],
    ]);
    const optional = FormulaSerializer.serialize([round], (_, i) => ({
      name: 'n',
      optional: i === 1,
    }));
    expect(optional.text).toBe('ROUND([Qty])');
    expect(optional.complete).toBe(true);

    const required = FormulaSerializer.serialize([round], (_, i) => ({
      name: i === 0 ? 'number' : 'digits',
      optional: false,
    }));
    expect(required.text).toBe('ROUND([Qty], ‹digits missing›)');
    expect(required.complete).toBe(false);
  });

  it('marks empty brackets missing', () => {
    expect(
      FormulaSerializer.serialize([ItemFactory.group([])], TestText.describeAnyValue).text,
    ).toBe('(‹value missing›)');
  });

  it("records each item's span, so an error position finds the item that caused it", () => {
    const qty = TestItems.col('Qty');
    const times = TestItems.op('*');
    const price = TestItems.col('Price');
    const round = ItemFactory.function(TestCatalogue.SCOPE.functions.get('ROUND'), 'ROUND', [
      [qty, times, price],
      [TestItems.lit(2)],
    ]);
    const { text: written, spans } = FormulaSerializer.serialize(
      [round],
      TestText.describeAnyValue,
    );

    const at = (needle: string): number => written.indexOf(needle);
    expect(FormulaSerializer.blockAtPosition(spans, at('[Price]'))).toBe(price.id);
    expect(FormulaSerializer.blockAtPosition(spans, at('[Qty]'))).toBe(qty.id);
    expect(FormulaSerializer.blockAtPosition(spans, at(' * '))).toBe(times.id);
    expect(FormulaSerializer.blockAtPosition(spans, at('ROUND'))).toBe(round.id);
  });
});

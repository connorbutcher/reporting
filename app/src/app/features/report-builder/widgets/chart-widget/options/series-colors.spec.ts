import { describe, expect, it } from 'vitest';
import { SeriesColors, SeriesPalette } from './series-colors';

describe('SeriesPalette', () => {
  it('gives a label the same colour in every chart, whatever else that chart plots', () => {
    const first = new SeriesPalette().resolve(['Supplier A', 'Supplier B']);
    const second = new SeriesPalette().resolve(['Supplier C', 'Supplier A']);

    expect(second.get('Supplier A')).toBe(first.get('Supplier A'));
  });

  it('still gives every series in one chart its own colour', () => {
    const labels = Array.from({ length: SeriesColors.PALETTE.length }, (_, i) => `Series ${i}`);
    const colors = new SeriesPalette().resolve(labels);

    expect(new Set(colors.values()).size).toBe(labels.length);
  });

  it('keeps the alarm red out of the palette', () => {
    expect(SeriesColors.PALETTE).not.toContain('#dc2626');
  });
});

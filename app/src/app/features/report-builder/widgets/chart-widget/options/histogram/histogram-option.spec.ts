import { describe, expect, it } from 'vitest';
import { HistogramOption } from './histogram-option';

const bins = [
  { lower: -1, upper: 0, label: '' },
  { lower: 0, upper: 1, label: '' },
];

describe('HistogramOption.normalCurve', () => {
  it('scales the fitted curve to the bars’ own units', () => {
    const series = { mean: 0, stdDev: 1, count: 100 };
    // The standard normal density half a σ from the mean.
    const pdf = Math.exp(-0.125) / Math.sqrt(2 * Math.PI);

    expect(HistogramOption.normalCurve(series, bins, 'density')?.[1]).toBeCloseTo(pdf);
    expect(HistogramOption.normalCurve(series, bins, 'frequency')?.[1]).toBeCloseTo(pdf * 1);
    expect(HistogramOption.normalCurve(series, bins, 'count')?.[1]).toBeCloseTo(pdf * 100);
  });

  it('draws nothing for a distribution with no spread', () => {
    expect(HistogramOption.normalCurve({ mean: 1, stdDev: 0, count: 5 }, bins, 'count')).toBeNull();
  });
});

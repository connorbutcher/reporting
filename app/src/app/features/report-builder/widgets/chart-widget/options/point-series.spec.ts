import { describe, expect, it } from 'vitest';
import { PointSeries } from './point-series';

const DAY = 86_400_000;

describe('PointSeries.trendStatsText', () => {
  it('states a date axis slope per day rather than per millisecond', () => {
    // Rising 2 units a day over a month.
    const trend = {
      x1: 0,
      y1: 0,
      x2: 30 * DAY,
      y2: 60,
      slope: 2 / DAY,
      intercept: 0,
      rSquared: 0.9,
    };

    expect(PointSeries.trendStatsText(trend, true)).toBe('Slope: 2 / day · R²: 0.90');
  });

  it('switches to per month over a long date range', () => {
    const trend = {
      x1: 0,
      y1: 0,
      x2: 1000 * DAY,
      y2: 1000,
      slope: 1 / DAY,
      intercept: 0,
      rSquared: 1,
    };

    expect(PointSeries.trendStatsText(trend, true)).toBe('Slope: 30.4 / month · R²: 1.00');
  });

  it('keeps a small numeric slope readable instead of rounding it to zero', () => {
    const trend = { x1: 0, y1: 0, x2: 1, y2: 0.0012, slope: 0.0012, intercept: 0, rSquared: 0.5 };

    expect(PointSeries.trendStatsText(trend)).toBe('Slope: 0.0012 · R²: 0.50');
  });
});

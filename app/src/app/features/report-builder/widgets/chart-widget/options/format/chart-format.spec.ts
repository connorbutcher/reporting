import { describe, expect, it } from 'vitest';
import { ChartFormat } from './chart-format';

describe('ChartFormat.tick', () => {
  it('trims a fixed decimal count to what the tick needs', () => {
    const config = { kind: 'numeric' as const, decimals: 1, suffix: ' h' };

    expect(ChartFormat.tick(200, config)).toBe('200 h');
    expect(ChartFormat.tick(1000, config)).toBe('1,000 h');
    expect(ChartFormat.tick(2.5, config)).toBe('2.5 h');
  });

  it('keeps the column format when it has no fixed decimals', () => {
    expect(ChartFormat.tick(1234.5678, { kind: 'numeric', prefix: '£' })).toBe('£1,234.568');
  });
});

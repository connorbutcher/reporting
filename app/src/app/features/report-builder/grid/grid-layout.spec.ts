import { describe, expect, it } from 'vitest';
import { GridLayout } from './grid-layout';

describe('GridLayout.usedRows', () => {
  it('ends at the bottom of the lowest rect', () => {
    const rects = [
      { x: 0, y: 0, w: 48, h: 2 },
      { x: 0, y: 2, w: 24, h: 10 },
      { x: 24, y: 2, w: 24, h: 6 },
    ];

    expect(GridLayout.usedRows(rects)).toBe(12);
  });

  it('keeps one row for an empty tab', () => {
    expect(GridLayout.usedRows([])).toBe(1);
  });
});

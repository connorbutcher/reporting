import { describe, expect, it } from 'vitest';
import { ChartZoomMemory } from './chart-zoom';

describe('ChartZoomMemory', () => {
  it('reads a zoom window from a single event or the first of a batch', () => {
    expect(ChartZoomMemory.fromEvent({ start: 10, end: 40 })).toEqual({ start: 10, end: 40 });
    expect(
      ChartZoomMemory.fromEvent({
        batch: [
          { start: 5, end: 50 },
          { start: 0, end: 100 },
        ],
      }),
    ).toEqual({
      start: 5,
      end: 50,
    });
    expect(ChartZoomMemory.fromEvent({ startValue: 3 })).toBeNull();
  });

  it('applies a remembered window to the X zooms but never to the value-axis zoom', () => {
    const option = {
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'inside', yAxisIndex: 0, id: ChartZoomMemory.VALUE_ZOOM_ID },
      ],
    };

    const applied = ChartZoomMemory.apply(option, { start: 20, end: 60 });

    expect(applied.dataZoom).toEqual([
      { type: 'inside', xAxisIndex: 0, start: 20, end: 60 },
      { type: 'inside', yAxisIndex: 0, id: ChartZoomMemory.VALUE_ZOOM_ID },
    ]);
  });

  it('remembers a window per chart and forgets it once zoomed back out', () => {
    ChartZoomMemory.write('w1', { start: 25, end: 75 });
    expect(ChartZoomMemory.read('w1')).toEqual({ start: 25, end: 75 });
    expect(ChartZoomMemory.read('w2')).toBeNull();

    ChartZoomMemory.write('w1', { start: 0, end: 100 });
    expect(ChartZoomMemory.read('w1')).toBeNull();
  });
});

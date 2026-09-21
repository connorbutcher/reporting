import { describe, expect, it } from 'vitest';
import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  ChartQueryResult,
} from '../../../../core/models/widget-query';
import { ChartCountBar } from './chart-count-bar';

const bar = (over: Partial<BarChartQueryResult>): BarChartQueryResult => ({
  id: '1',
  name: 'D',
  categories: [],
  series: [],
  toleranceBands: [],
  totalRowCount: 52,
  matchedRowCount: 52,
  ...over,
});

describe('ChartCountBar', () => {
  it('shows a plain row count when nothing is filtered', () => {
    expect(ChartCountBar.build(bar({ totalRowCount: 1300, matchedRowCount: 1300 }), false)).toEqual({
      label: '1,300 rows',
      icon: 'pi-list',
      warning: false,
    });
    expect(ChartCountBar.build(bar({ totalRowCount: 1, matchedRowCount: 1 }), false).label).toBe('1 row');
  });

  it('shows the filtered view when a filter narrows the dataset', () => {
    expect(ChartCountBar.build(bar({ matchedRowCount: 40 }), false)).toEqual({
      label: 'Showing 40 of 52 rows',
      icon: 'pi-filter',
      warning: false,
    });
  });

  it('warns that a capped point chart plots only some of its points', () => {
    const points: ChartQueryResult = {
      id: '1',
      name: 'D',
      series: [{ label: '', points: [{ x: 1, y: 1, tooltipLines: [] }, { x: 2, y: 2, tooltipLines: [] }] }],
      toleranceBands: [],
      totalRowCount: 30000,
      matchedRowCount: 30000,
      totalPoints: 25000,
      truncated: true,
    };

    expect(ChartCountBar.build(points, true)).toEqual({
      label: 'Showing first 2 of 25,000 points',
      icon: 'pi-list',
      warning: true,
    });
  });

  it('warns that a box plot or histogram whose scan hit its cap covers only the rows it read', () => {
    const box: BoxPlotQueryResult = {
      id: '1',
      name: 'D',
      categories: [],
      series: [],
      toleranceBands: [],
      totalRowCount: 300000,
      matchedRowCount: 250000,
      truncated: true,
      scannedRowCount: 200000,
    };

    expect(ChartCountBar.build(box, false)).toMatchObject({
      label: 'Showing first 200,000 of 250,000 rows',
      warning: true,
    });
  });

  it('says how many overlaid series failed to load, and warns', () => {
    const result = ChartCountBar.build({ ...bar({ matchedRowCount: 40 }), failedBindingCount: 1 }, false);

    expect(result.label).toBe('Showing 40 of 52 rows · 1 series couldn’t load');
    expect(result.warning).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { ChartWidgetConfig } from '../../../../core/models/report';
import { XBarRChartQueryResult } from '../../../../core/models/widget-query';
import { ChartExport } from './chart-export';

describe('ChartExport', () => {
  it('names a control chart’s columns for its mode, and leaves out spread columns on a p chart', () => {
    const data: XBarRChartQueryResult = {
      id: '1',
      name: 'D',
      categories: ['L1'],
      subgroups: [
        {
          mean: 0.25,
          range: 0,
          count: 4,
          hasRange: false,
          xBarUcl: 0.9,
          xBarLcl: 0,
          rUcl: 0,
          rLcl: 0,
          meanOutOfControl: false,
          rangeOutOfControl: false,
        },
      ],
      xBarCenterLine: 0.25,
      rCenterLine: 0,
      mode: 'p',
      toleranceBands: [],
      totalRowCount: 4,
      matchedRowCount: 4,
    };

    const table = ChartExport.table({ type: 'xbarRChart' } as ChartWidgetConfig, data, []);

    expect(table).toEqual([
      [
        'Subgroup',
        'N',
        'Proportion defective',
        'p UCL',
        'p LCL',
        'Proportion defective out of control',
      ],
      ['L1', 4, 0.25, 0.9, 0, false],
    ]);
    expect(
      ChartExport.csv({ type: 'xbarRChart' } as ChartWidgetConfig, data, []).split('\n')[1],
    ).toBe('L1,4,0.25,0.9,0,false');
  });
});

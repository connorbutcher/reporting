import { describe, expect, it } from 'vitest';
import { DatasetColumn } from '../../../../../core/models/dataset';
import {
  ChartSeriesBinding,
  ComboChartWidgetConfig,
  DEFAULT_COMBO_CHART_CONFIG,
} from '../../../../../core/models/report';
import { BarChartQueryResult } from '../../../../../core/models/widget-query';
import { ComboOption } from './combo-option';
import { ReferenceSeries } from './reference-series';

const columns = [
  { id: 'month', name: 'Month', type: 'string', order: 0, configuration: { kind: 'text' } },
  { id: 'qty', name: 'Qty', type: 'double', order: 1, configuration: { kind: 'numeric' } },
] as DatasetColumn[];

const binding = (id: string, renderAs: 'bar' | 'line'): ChartSeriesBinding =>
  ({
    id,
    datasetId: 1,
    xColumnId: 'month',
    yColumnId: 'qty',
    valueColumnIds: ['qty'],
    seriesColumnId: null,
    label: id,
    renderAs,
  }) as ChartSeriesBinding;

const config = (over: Partial<ComboChartWidgetConfig> = {}): ComboChartWidgetConfig => ({
  ...DEFAULT_COMBO_CHART_CONFIG,
  type: 'comboChart',
  bindings: [binding('Actual', 'bar'), binding('Target', 'line')],
  ...over,
});

const data: BarChartQueryResult = {
  id: '1',
  name: 'D',
  categories: ['Jan', 'Feb', 'Mar'],
  series: [
    { label: 'Actual', bindingId: 'Actual', values: [1, 2, 3] },
    { label: 'Target', bindingId: 'Target', values: [2, null, 2] },
  ],
  toleranceBands: [],
  totalRowCount: 3,
  matchedRowCount: 3,
};

type AnySeries = { name?: string; type?: string; connectNulls?: boolean; markLine?: unknown };

describe('ComboOption', () => {
  it('draws each binding as bars or a line over the shared categories', () => {
    const series = ComboOption.build(config(), data, columns, new Map())?.series as AnySeries[];

    expect(series.map((s) => [s.name, s.type])).toEqual([
      ['Actual', 'bar'],
      ['Target', 'line'],
    ]);
  });

  it('bridges a line across missing categories only when asked', () => {
    const line = (c: ComboChartWidgetConfig) =>
      (ComboOption.build(c, data, columns, new Map())?.series as AnySeries[]).find(
        (s) => s.type === 'line',
      );

    expect(line(config())?.connectNulls).toBeUndefined();
    expect(line(config({ connectNulls: true }))?.connectNulls).toBe(true);
  });

  it('keeps guide lines on their own series, so hiding a data series leaves them drawn', () => {
    const series = ComboOption.build(
      config({
        guideLines: [
          { id: 'g', axis: 'y', value: 2, label: 'Goal' },
        ] as ComboChartWidgetConfig['guideLines'],
      }),
      data,
      columns,
      new Map(),
    )?.series as AnySeries[];

    expect(series.filter((s) => s.markLine)).toEqual([
      expect.objectContaining({ name: ReferenceSeries.NAME }),
    ]);
  });
});

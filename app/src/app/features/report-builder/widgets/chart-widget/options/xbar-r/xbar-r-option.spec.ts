import { describe, expect, it } from 'vitest';
import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  ChartSeriesBinding,
  DEFAULT_XBAR_R_CHART_CONFIG,
  XBarRChartWidgetConfig,
} from '../../../../../../core/models/report';
import { XBarRChartQueryResult, XBarRSubgroup } from '../../../../../../core/models/widget-query';
import { XBarROption } from './xbar-r-option';

const columns = [
  { id: 'lot', name: 'Lot', type: 'string', order: 0, configuration: { kind: 'text' } },
  {
    id: 'bad',
    name: 'Defective',
    type: 'double',
    order: 1,
    configuration: { kind: 'numeric', suffix: ' mm' },
  },
] as DatasetColumn[];

const config = (over: Partial<XBarRChartWidgetConfig> = {}): XBarRChartWidgetConfig => ({
  ...DEFAULT_XBAR_R_CHART_CONFIG,
  type: 'xbarRChart',
  bindings: [
    {
      id: 'a',
      datasetId: 1,
      xColumnId: 'lot',
      yColumnId: 'bad',
      seriesColumnId: null,
      label: '',
    } as ChartSeriesBinding,
  ],
  ...over,
});

const subgroup = (mean: number, out = false, rules: number[] = []): XBarRSubgroup => ({
  mean,
  range: 0,
  count: 4,
  hasRange: false,
  xBarUcl: 0.9,
  xBarLcl: 0,
  rUcl: 0,
  rLcl: 0,
  meanOutOfControl: out,
  rangeOutOfControl: false,
  meanRules: rules,
});

const result = (mode: XBarRChartQueryResult['mode']): XBarRChartQueryResult => ({
  id: '1',
  name: 'D',
  categories: ['L1', 'L2'],
  subgroups: [subgroup(0.25), subgroup(1, true, [1])],
  xBarCenterLine: 0.4,
  rCenterLine: 0,
  mode,
  toleranceBands: [],
  totalRowCount: 8,
  matchedRowCount: 8,
});

type AnyAxis = { name?: string; axisLabel?: { formatter?: (v: number) => string } };
type AnySeries = { name?: string; data?: { symbol?: string }[] };

describe('XBarROption attribute charts', () => {
  it('draws a p chart on one grid, as percentages, without the measure’s units', () => {
    const option = XBarROption.build(config({ mode: 'p' }), result('p'), columns);
    const yAxis = option?.yAxis as AnyAxis;

    expect(Array.isArray(option?.grid)).toBe(false);
    expect(yAxis.name).toBe('Proportion defective');
    expect(yAxis.axisLabel?.formatter?.(0.25)).toBe('25.0%');
  });

  it('marks an out-of-control point with a triangle as well as red', () => {
    const option = XBarROption.build(config({ mode: 'np' }), result('np'), columns);
    const points = (option?.series as AnySeries[])[0].data ?? [];

    expect(points.map((p) => p.symbol)).toEqual([undefined, 'triangle']);
  });

  it('keeps the two-chart layout for Xbar-R', () => {
    const option = XBarROption.build(config(), result('xBarR'), columns);

    expect(Array.isArray(option?.grid)).toBe(true);
  });
});

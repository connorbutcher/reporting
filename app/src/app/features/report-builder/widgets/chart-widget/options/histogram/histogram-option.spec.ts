import { describe, expect, it } from 'vitest';
import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  ChartSeriesBinding,
  HistogramWidgetConfig,
  WidgetConfigDefaults,
} from '../../../../../../core/models/report';
import { HistogramQueryResult } from '../../../../../../core/models/widget-query';
import { ReferenceSeries } from '../marks/reference-series';
import { HistogramOption } from './histogram-option';

const columns: DatasetColumn[] = [
  {
    id: 'width',
    name: 'Width',
    type: 'double',
    order: 0,
    configuration: { kind: 'numeric' },
  },
] as DatasetColumn[];

const config = (over: Partial<HistogramWidgetConfig> = {}): HistogramWidgetConfig => ({
  ...WidgetConfigDefaults.HISTOGRAM,
  type: 'histogram',
  bindings: [{ id: 'a', datasetId: 1, xColumnId: 'width', label: '' } as ChartSeriesBinding],
  ...over,
});

const data: HistogramQueryResult = {
  id: '1',
  name: 'D',
  bins: [
    { lower: 0, upper: 2, label: '0 – 2' },
    { lower: 2, upper: 4, label: '2 – 4' },
    { lower: 4, upper: 6, label: '4 – 6' },
  ],
  series: [{ label: '', values: [1, 3, 1] }],
  toleranceBands: [
    {
      id: 'spec',
      axis: 'x',
      min: 1,
      max: 5.5,
      concessionLower: null,
      concessionUpper: null,
      fill: true,
      outlinePoints: false,
    },
  ],
  totalRowCount: 5,
  matchedRowCount: 5,
};

type AnySeries = {
  name?: string;
  xAxisIndex?: number;
  yAxisIndex?: number;
  markLine?: { data: { xAxis?: number; yAxis?: number }[] };
};
type AnyAxis = { type?: string; min?: number; max?: number; show?: boolean; inverse?: boolean };

const reference = (option: ReturnType<typeof HistogramOption.build>) =>
  (option?.series as AnySeries[]).find((s) => s.name === ReferenceSeries.NAME);

describe('HistogramOption', () => {
  it('draws limits on a hidden value axis spanning the bins, not snapped to bar centres', () => {
    const option = HistogramOption.build(config(), data, columns, new Map());
    const [, position] = option?.xAxis as AnyAxis[];
    const marks = reference(option);

    expect(position).toEqual({ type: 'value', min: -0.5, max: 2.5, show: false });
    expect(marks?.xAxisIndex).toBe(1);
    // 1 sits halfway across the first bin's 0–2 and 5.5 three quarters across the last's 4–6.
    expect(marks?.markLine?.data.map((m) => m.xAxis)).toEqual([0, 2.25]);
    // The count axis would otherwise be drawn at the position axis's zero, mid-way across a bar.
    expect((option?.yAxis as { axisLine?: { onZero?: boolean } }).axisLine?.onZero).toBe(false);
  });

  it('flips the position axis with the bins on a horizontal histogram', () => {
    const option = HistogramOption.build(config({ horizontal: true }), data, columns, new Map());
    const [, position] = option?.yAxis as AnyAxis[];

    expect(position.inverse).toBe(true);
    expect(reference(option)?.yAxisIndex).toBe(1);
  });
});

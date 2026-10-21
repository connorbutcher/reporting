import { describe, expect, it } from 'vitest';
import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  BarChartWidgetConfig,
  ChartSeriesBinding,
  DEFAULT_BAR_CHART_CONFIG,
} from '../../../../../../core/models/report';
import { BarChartQueryResult } from '../../../../../../core/models/widget-query';
import { BarOption } from './bar-option';
import { BarValues } from './bar-values';
import { ReferenceSeries } from '../marks/reference-series';

const columns: DatasetColumn[] = [
  { id: 'region', name: 'Region', type: 'string', order: 0, configuration: { kind: 'text' } },
  {
    id: 'price',
    name: 'Price',
    type: 'double',
    order: 1,
    configuration: { kind: 'numeric', prefix: '£' },
  },
] as DatasetColumn[];

const config = (over: Partial<BarChartWidgetConfig> = {}): BarChartWidgetConfig => ({
  ...DEFAULT_BAR_CHART_CONFIG,
  type: 'barChart',
  bindings: [
    {
      id: 'a',
      datasetId: 1,
      xColumnId: 'region',
      yColumnId: 'price',
      valueColumnIds: ['price'],
      seriesColumnId: null,
      label: '',
    } as ChartSeriesBinding,
  ],
  ...over,
});

const data = (series: BarChartQueryResult['series']): BarChartQueryResult => ({
  id: '1',
  name: 'D',
  categories: ['North', 'South'],
  series,
  toleranceBands: [],
  totalRowCount: 10,
  matchedRowCount: 10,
});

type AnySeries = { name?: string; data?: unknown[]; markLine?: unknown; stack?: string };
type AnyAxis = {
  name?: string;
  inverse?: boolean;
  axisLabel?: { formatter?: (v: number) => string };
};
const seriesOf = (option: ReturnType<typeof BarOption.build>) => option?.series as AnySeries[];

describe('BarOption', () => {
  it('names a count axis "Count of rows" and never formats it with a leftover measure', () => {
    const option = BarOption.build(
      config({ aggregate: 'count' }),
      data([{ label: '', values: [12, 3] }]),
      columns,
      new Map(),
    );
    const valueAxis = option?.yAxis as AnyAxis;

    expect(valueAxis.name).toBe('Count of rows');
    expect(valueAxis.axisLabel?.formatter?.(12)).toBe('12');
  });

  it('names a measure axis by its aggregate and column', () => {
    const option = BarOption.build(
      config(),
      data([{ label: '', values: [1, 2] }]),
      columns,
      new Map(),
    );

    expect((option?.yAxis as AnyAxis).name).toBe('Sum of Price');
  });

  it('hangs reference lines on their own series, not on a data series the legend can hide', () => {
    const option = BarOption.build(
      config({
        guideLines: [
          { id: 'g', axis: 'y', value: 5, label: 'Target' },
        ] as BarChartWidgetConfig['guideLines'],
      }),
      data([{ label: '', values: [1, 2] }]),
      columns,
      new Map(),
    );
    const series = seriesOf(option);

    expect(series[0].markLine).toBeUndefined();
    expect(series.find((s) => s.name === ReferenceSeries.NAME)?.markLine).toBeDefined();
  });

  it('turns 100% stacked bars into each series’ share of its category', () => {
    const option = BarOption.build(
      config({ percentStacked: true }),
      data([
        { label: 'A', bindingId: 'a', values: [1, 3] },
        { label: 'B', bindingId: 'a', values: [3, 1] },
      ]),
      columns,
      new Map(),
    );
    const [a, b] = seriesOf(option);

    expect(a.data).toEqual([25, 75]);
    expect(b.data).toEqual([75, 25]);
    expect(a.stack).toBe('a');
  });

  it('adds a total label series per stack when asked', () => {
    const option = BarOption.build(
      config({ stacked: true, showStackTotals: true }),
      data([
        { label: 'A', bindingId: 'a', values: [1, 3] },
        { label: 'B', bindingId: 'a', values: [3, 1] },
      ]),
      columns,
      new Map(),
    );
    const totals = seriesOf(option).filter((s) => s.name?.startsWith(BarValues.TOTAL_PREFIX));

    expect(totals).toHaveLength(1);
    expect(totals[0].stack).toBe('a');
  });

  it('reads a horizontal chart top-down', () => {
    const option = BarOption.build(
      config({ horizontal: true }),
      data([{ label: '', values: [1, 2] }]),
      columns,
      new Map(),
    );

    expect((option?.yAxis as AnyAxis).inverse).toBe(true);
  });
});

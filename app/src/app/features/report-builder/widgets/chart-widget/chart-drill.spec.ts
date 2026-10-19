import { describe, expect, it } from 'vitest';
import { FilterGroup } from '../../../../core/models/filter';
import { ChartSeriesBinding, ChartWidgetConfig } from '../../../../core/models/report';
import { BarChartQueryResult, HistogramQueryResult } from '../../../../core/models/widget-query';
import { ChartDrill } from './chart-drill';

const binding = (id: string, datasetId: number, xColumnId = 'category'): ChartSeriesBinding =>
  ({ id, datasetId, xColumnId, yColumnId: 'value', valueColumnIds: ['value'], seriesColumnId: null, label: '' }) as ChartSeriesBinding;

const config = (type: string, ...bindings: ChartSeriesBinding[]): ChartWidgetConfig =>
  ({ type, bindings, toleranceBands: [] }) as unknown as ChartWidgetConfig;

const equals = (columnId: string, value: string): FilterGroup => ({
  kind: 'group',
  join: 'and',
  children: [{ kind: 'condition', columnId, operator: 'equals', values: [value] }],
});

/** Every condition anywhere in a filter, flattened, as "column operator value". */
const conditions = (filter: FilterGroup | null): string[] =>
  (filter?.children ?? []).flatMap((child) =>
    child.kind === 'group' ? conditions(child) : [`${child.columnId} ${child.operator} ${child.values.join(',')}`],
  );

describe('ChartDrill', () => {
  it('drills a bar into its binding’s dataset, combining the binding filter, the category and the split', () => {
    const data: BarChartQueryResult = {
      id: '1',
      name: 'D',
      categories: ['North', 'South'],
      series: [
        {
          label: 'Red',
          bindingId: 'b',
          values: [1, 2],
          categoryDrills: [equals('region', 'North'), equals('region', 'South')],
          drill: equals('colour', 'Red'),
        },
      ],
      toleranceBands: [],
      totalRowCount: 2,
      matchedRowCount: 2,
    };

    const target = ChartDrill.target(
      config('barChart', binding('a', 1), binding('b', 2)),
      data,
      { seriesName: 'Red', dataIndex: 1 },
      { b: equals('year', '2026') },
    );

    expect(target?.datasetId).toBe(2);
    expect(target?.path).toEqual(['South', 'Red']);
    expect(conditions(target?.filter ?? null).sort()).toEqual(
      ['colour equals Red', 'region equals South', 'year equals 2026'].sort(),
    );
  });

  it('has nothing to drill into for the “Other” category', () => {
    const data: BarChartQueryResult = {
      id: '1',
      name: 'D',
      categories: ['North', 'Other'],
      categoryDetails: [{ drill: equals('region', 'North') }, { isOther: true, drill: null }],
      series: [{ label: '', values: [1, 2] }],
      toleranceBands: [],
      totalRowCount: 2,
      matchedRowCount: 2,
    };

    expect(ChartDrill.target(config('barChart', binding('a', 1)), data, { dataIndex: 1 }, null)).toBeNull();
  });

  it('drills a histogram bin by its half-open range, closing the last bin', () => {
    const data: HistogramQueryResult = {
      id: '1',
      name: 'D',
      bins: [
        { lower: 0, upper: 5, label: '0 – 5' },
        { lower: 5, upper: 10, label: '5 – 10' },
      ],
      series: [{ label: '', values: [3, 4] }],
      toleranceBands: [],
      totalRowCount: 7,
      matchedRowCount: 7,
    };
    const histogram = config('histogram', binding('a', 1, 'value'));

    expect(conditions(ChartDrill.target(histogram, data, { dataIndex: 0 }, null)?.filter ?? null)).toEqual([
      'value greaterThanOrEqual 0',
      'value lessThan 5',
    ]);
    expect(conditions(ChartDrill.target(histogram, data, { dataIndex: 1 }, null)?.filter ?? null)).toEqual([
      'value greaterThanOrEqual 5',
      'value lessThanOrEqual 10',
    ]);
  });
});

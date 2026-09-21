import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import { ChartSeriesBinding, ChartWidgetConfig } from '../../../../../core/models/report';
import { BarChartQueryResult, ChartRowCounts } from '../../../../../core/models/widget-query';
import { ChartQuery } from './chart-query';

const binding = (id: string, datasetId: number): ChartSeriesBinding =>
  ({
    id,
    datasetId,
    xColumnId: 'category',
    yColumnId: 'value',
    valueColumnIds: ['value'],
    seriesColumnId: null,
    label: '',
  }) as ChartSeriesBinding;

const barConfig = (...bindings: ChartSeriesBinding[]): ChartWidgetConfig =>
  ({ type: 'barChart', aggregate: 'sum', bindings, toleranceBands: [] }) as unknown as ChartWidgetConfig;

/** A stub API answering each bar query from a per-dataset table of row counts. */
const apiWith = (countsByDataset: Record<number, ChartRowCounts>): DatasetApiService =>
  ({
    queryBarChart: (datasetId: number) =>
      of({
        id: String(datasetId),
        name: `Dataset ${datasetId}`,
        categories: ['a'],
        series: [{ label: '', valueColumnId: 'value', values: [1] }],
        toleranceBands: [],
        ...countsByDataset[datasetId],
      } satisfies BarChartQueryResult),
  }) as unknown as DatasetApiService;

const run = (api: DatasetApiService, config: ChartWidgetConfig) => {
  const request = ChartQuery.build(api, config, null);
  if (!request) throw new Error('expected a query');
  return firstValueFrom(request) as Promise<BarChartQueryResult>;
};

describe('ChartQuery row counts', () => {
  it('passes a single binding’s counts straight through', async () => {
    const api = apiWith({ 1: { totalRowCount: 52, matchedRowCount: 40 } });

    const result = await run(api, barConfig(binding('a', 1)));

    expect(result.totalRowCount).toBe(52);
    expect(result.matchedRowCount).toBe(40);
  });

  it('counts a dataset once when several bindings overlay it', async () => {
    const api = apiWith({ 1: { totalRowCount: 52, matchedRowCount: 52 } });

    const result = await run(api, barConfig(binding('a', 1), binding('b', 1)));

    // Two series drawn from the same rows must not read as "104 of 52".
    expect(result.totalRowCount).toBe(52);
    expect(result.matchedRowCount).toBe(52);
  });

  it('reports the widest slice when bindings on one dataset are filtered differently', async () => {
    let call = 0;
    const api = {
      queryBarChart: () =>
        of({
          id: '1',
          name: 'D',
          categories: ['a'],
          series: [{ label: '', valueColumnId: 'value', values: [1] }],
          toleranceBands: [],
          totalRowCount: 52,
          matchedRowCount: [10, 30][call++],
        } satisfies BarChartQueryResult),
    } as unknown as DatasetApiService;

    const result = await run(api, barConfig(binding('a', 1), binding('b', 1)));

    expect(result.totalRowCount).toBe(52);
    expect(result.matchedRowCount).toBe(30);
  });

  it('sums across distinct datasets', async () => {
    const api = apiWith({
      1: { totalRowCount: 52, matchedRowCount: 40 },
      2: { totalRowCount: 100, matchedRowCount: 100 },
    });

    const result = await run(api, barConfig(binding('a', 1), binding('b', 2)));

    expect(result.totalRowCount).toBe(152);
    expect(result.matchedRowCount).toBe(140);
  });
});

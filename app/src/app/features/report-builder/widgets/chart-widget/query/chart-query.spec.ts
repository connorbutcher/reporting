import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import {
  ChartSeriesBinding,
  ChartWidgetConfig,
  HistogramBinMode,
} from '../../../../../core/models/report';
import {
  BarChartQueryResult,
  ChartRowCounts,
  HistogramBin,
  HistogramQueryResult,
} from '../../../../../core/models/widget-query';
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
  ({
    type: 'barChart',
    aggregate: 'sum',
    bindings,
    toleranceBands: [],
  }) as unknown as ChartWidgetConfig;

const histBinding = (
  id: string,
  datasetId: number,
  label = '',
  valueColumnIds = ['value'],
): ChartSeriesBinding =>
  ({
    id,
    datasetId,
    xColumnId: 'value',
    yColumnId: null,
    valueColumnIds,
    seriesColumnId: null,
    label,
  }) as ChartSeriesBinding;

const histogramConfig = (
  binMode: HistogramBinMode,
  rangeMin: number | null,
  rangeMax: number | null,
  ...bindings: ChartSeriesBinding[]
): ChartWidgetConfig =>
  ({
    type: 'histogram',
    binMode,
    binCount: 10,
    binWidth: 1,
    rangeMin,
    rangeMax,
    normalize: 'count',
    cumulative: false,
    bindings,
    toleranceBands: [],
  }) as unknown as ChartWidgetConfig;

/** Evenly spaced bins spanning [min, max]. */
const binsFrom = (min: number, max: number, count: number): HistogramBin[] => {
  const step = (max - min) / count;
  return Array.from({ length: count }, (_, i) => ({
    lower: min + i * step,
    upper: min + (i + 1) * step,
    label: `${min + i * step}`,
  }));
};

const runHistogram = (api: DatasetApiService, config: ChartWidgetConfig) => {
  const request = ChartQuery.build(api, config, null);
  if (!request) {
    throw new Error('expected a query');
  }
  return firstValueFrom(request) as Promise<HistogramQueryResult>;
};

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
  if (!request) {
    throw new Error('expected a query');
  }
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

  it('draws the bindings that loaded and counts the ones that failed', async () => {
    const api = {
      queryBarChart: (datasetId: number) =>
        datasetId === 2
          ? throwError(() => new Error('boom'))
          : of({
              id: '1',
              name: 'D',
              categories: ['a'],
              series: [{ label: '', valueColumnId: 'value', values: [1] }],
              toleranceBands: [],
              totalRowCount: 52,
              matchedRowCount: 40,
            } satisfies BarChartQueryResult),
    } as unknown as DatasetApiService;

    const result = await run(api, barConfig(binding('a', 1), binding('b', 2)));

    expect(result.failedBindingCount).toBe(1);
    expect(result.matchedRowCount).toBe(40);
  });

  it('reports no failures when every binding loads', async () => {
    const api = apiWith({ 1: { totalRowCount: 52, matchedRowCount: 40 } });

    expect((await run(api, barConfig(binding('a', 1)))).failedBindingCount).toBe(0);
  });
});

describe('ChartQuery histogram overlay', () => {
  it('queries a single binding once, unaligned', async () => {
    let calls = 0;
    const api = {
      queryHistogram: () => {
        calls++;
        return of({
          id: '1',
          name: 'D',
          bins: binsFrom(0, 10, 2),
          series: [{ label: '', values: [3, 4] }],
          toleranceBands: [],
          totalRowCount: 10,
          matchedRowCount: 10,
        } satisfies HistogramQueryResult);
      },
    } as unknown as DatasetApiService;

    const result = await runHistogram(
      api,
      histogramConfig('auto', null, null, histBinding('a', 1)),
    );

    expect(calls).toBe(1);
    // Each series remembers the binding it came from, for drill-through and colour overrides.
    expect(result.series[0].bindingId).toBe('a');
    // No binding label and no split: the single series falls back to the dataset's own name.
    expect(labelsAndValues(result.series)).toEqual([{ label: 'D', values: [3, 4] }]);
  });

  it('queries a single binding with several value columns exactly once, with no probe pass', async () => {
    let calls = 0;
    let seenValueColumnIds: string[] = [];
    const api = {
      queryHistogram: (_datasetId: number, req: Record<string, unknown>) => {
        calls++;
        seenValueColumnIds = req['valueColumnIds'] as string[];
        return of({
          id: '1',
          name: 'D',
          bins: binsFrom(0, 10, 2),
          series: [
            { label: '', valueColumnId: 'a', valueColumnLabel: 'A', values: [3, 4] },
            { label: '', valueColumnId: 'b', valueColumnLabel: 'B', values: [1, 2] },
          ],
          toleranceBands: [],
          totalRowCount: 10,
          matchedRowCount: 10,
        } satisfies HistogramQueryResult);
      },
    } as unknown as DatasetApiService;

    const result = await runHistogram(
      api,
      histogramConfig('auto', null, null, histBinding('x', 1, '', ['a', 'b'])),
    );

    // One binding, several value columns: a single request carries both, no shared-edges probe.
    expect(calls).toBe(1);
    expect(seenValueColumnIds).toEqual(['a', 'b']);
    expect(labelsAndValues(result.series)).toEqual([
      { label: 'A', values: [3, 4] },
      { label: 'B', values: [1, 2] },
    ]);
  });

  it('queries each binding once when the range and bin count are already fixed', async () => {
    let calls = 0;
    const api = {
      queryHistogram: (datasetId: number) => {
        calls++;
        return of({
          id: String(datasetId),
          name: `D${datasetId}`,
          bins: binsFrom(0, 2, 2),
          series: [{ label: '', values: datasetId === 1 ? [3, 4] : [5, 6] }],
          toleranceBands: [],
          totalRowCount: 10,
          matchedRowCount: 10,
        } satisfies HistogramQueryResult);
      },
    } as unknown as DatasetApiService;

    const result = await runHistogram(
      api,
      histogramConfig('count', 0, 2, histBinding('a', 1, 'A'), histBinding('b', 2, 'B')),
    );

    // An explicit range and an explicit count need no probe round trip to agree.
    expect(calls).toBe(2);
    expect(result.bins.length).toBe(2);
    expect(labelsAndValues(result.series)).toEqual([
      { label: 'A', values: [3, 4] },
      { label: 'B', values: [5, 6] },
    ]);
  });

  it('aligns bin edges across bindings when Auto mode would otherwise pick a count per dataset', async () => {
    const seen: {
      datasetId: number;
      binMode: string;
      rangeMin: number | null;
      rangeMax: number | null;
      binCount: number;
    }[] = [];
    const api = {
      queryHistogram: (datasetId: number, req: Record<string, unknown>) => {
        seen.push({
          datasetId,
          binMode: req['binMode'] as string,
          rangeMin: req['rangeMin'] as number | null,
          rangeMax: req['rangeMax'] as number | null,
          binCount: req['binCount'] as number,
        });

        // The probe pass: each binding reports its own natural range and Auto-derived bin count.
        if (req['binMode'] === 'auto') {
          return of(
            datasetId === 1
              ? ({
                  id: '1',
                  name: 'D1',
                  bins: binsFrom(0, 10, 5),
                  series: [{ label: '', values: [1, 1, 1, 1, 1] }],
                  toleranceBands: [],
                  totalRowCount: 10,
                  matchedRowCount: 10,
                } satisfies HistogramQueryResult)
              : ({
                  id: '2',
                  name: 'D2',
                  bins: binsFrom(5, 20, 3),
                  series: [{ label: '', values: [2, 2, 2] }],
                  toleranceBands: [],
                  totalRowCount: 10,
                  matchedRowCount: 10,
                } satisfies HistogramQueryResult),
          );
        }

        // The final pass: every binding queried with the same aligned range and bin count.
        const binCount = req['binCount'] as number;
        return of({
          id: String(datasetId),
          name: `D${datasetId}`,
          bins: binsFrom(req['rangeMin'] as number, req['rangeMax'] as number, binCount),
          series: [{ label: '', values: new Array(binCount).fill(datasetId) }],
          toleranceBands: [],
          totalRowCount: 10,
          matchedRowCount: 10,
        } satisfies HistogramQueryResult);
      },
    } as unknown as DatasetApiService;

    const result = await runHistogram(
      api,
      histogramConfig('auto', null, null, histBinding('a', 1, 'A'), histBinding('b', 2, 'B')),
    );

    // Each binding is probed once, then re-queried once more with the aligned request.
    expect(seen.filter((s) => s.binMode === 'auto').length).toBe(2);
    const finals = seen.filter((s) => s.binMode === 'count');
    expect(finals.length).toBe(2);
    for (const final of finals) {
      // The widest data extent across both probes, and the finer of their two Auto bin counts.
      expect(final.rangeMin).toBe(0);
      expect(final.rangeMax).toBe(20);
      expect(final.binCount).toBe(5);
    }

    expect(result.bins.length).toBe(5);
    expect(labelsAndValues(result.series)).toEqual([
      { label: 'A', values: [1, 1, 1, 1, 1] },
      { label: 'B', values: [2, 2, 2, 2, 2] },
    ]);
  });

  it('draws the bindings that loaded and counts the ones that failed', async () => {
    const api = {
      queryHistogram: (datasetId: number) =>
        datasetId === 2
          ? throwError(() => new Error('boom'))
          : of({
              id: '1',
              name: 'D',
              bins: binsFrom(0, 1, 1),
              series: [{ label: '', values: [5] }],
              toleranceBands: [],
              totalRowCount: 10,
              matchedRowCount: 10,
            } satisfies HistogramQueryResult),
    } as unknown as DatasetApiService;

    const result = await runHistogram(
      api,
      histogramConfig('count', 0, 1, histBinding('a', 1), histBinding('b', 2)),
    );

    expect(result.failedBindingCount).toBe(1);
    // Only one binding survives: no binding label and no split, so it falls back to the dataset name.
    expect(labelsAndValues(result.series)).toEqual([{ label: 'D', values: [5] }]);
  });
});

/** Just the label and values of each histogram series — what these overlay tests are about. */
function labelsAndValues(
  series: readonly { label: string; values: number[] }[],
): { label: string; values: number[] }[] {
  return series.map(({ label, values }) => ({ label, values }));
}

describe('ChartQuery bar overlay ordering', () => {
  const part = (datasetId: number, categories: string[]): BarChartQueryResult => ({
    id: String(datasetId),
    name: `Dataset ${datasetId}`,
    categories,
    categoryDetails: categories.map((c) => ({ sortText: c })),
    series: [{ label: '', valueColumnId: 'value', values: categories.map(() => 1) }],
    toleranceBands: [],
    totalRowCount: 1,
    matchedRowCount: 1,
  });

  it('re-sorts the union of categories, so a later dataset’s categories don’t trail at the end', async () => {
    const api = {
      queryBarChart: (datasetId: number) =>
        of(datasetId === 1 ? part(1, ['b', 'd']) : part(2, ['a', 'c'])),
    } as unknown as DatasetApiService;

    const result = await run(api, barConfig(binding('a', 1), binding('b', 2)));

    expect(result.categories).toEqual(['a', 'b', 'c', 'd']);
    // Each series' values follow its categories to their new positions.
    expect(result.series.map((s) => s.values)).toEqual([
      [null, 1, null, 1],
      [1, null, 1, null],
    ]);
  });
});

import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import { DatasetColumn } from '../../../../../core/models/dataset';
import { FilterGroup } from '../../../../../core/models/filter';
import {
  BarChartWidgetConfig,
  BoxPlotWidgetConfig,
  ChartSeriesBinding,
  ChartTooltipColumn,
  ChartWidgetConfig,
  ComboChartWidgetConfig,
  HistogramWidgetConfig,
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
  XBarRChartWidgetConfig,
  barValueColumnIds,
  histogramValueColumnIds,
  readChartBindings,
} from '../../../../../core/models/report';
import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  ChartQueryRequest,
  ChartQueryResult,
  HistogramQueryRequest,
  HistogramQueryResult,
  XBarRChartQueryResult,
} from '../../../../../core/models/widget-query';
import { ChartQueryPart } from './chart-query-part';
import { BarChartPart } from './bar-chart-part';
import { HistogramPart } from './histogram-part';
import { BarMerge } from './merge/bar-merge';
import { HistogramMerge } from './merge/histogram-merge';
import { PointMerge } from './merge/point-merge';

export class ChartQuery {
  /**
   * The server query for a chart's config, or null when too little is bound. Each bound binding is
   * queried on its own dataset and the results merged client-side.
   *
   * `bindingFilters` holds each binding's query-safe filter. `cache` memoizes responses by request
   * and is pruned to the current bindings. `columns` is the first bound dataset's schema; tooltip
   * columns are sent by name so other datasets can resolve them.
   */
  public static build(
    api: DatasetApiService,
    config: ChartWidgetConfig,
    bindingFilters: Record<string, FilterGroup | null> | null,
    cache?: Map<string, ChartQueryResult>,
    columns: readonly DatasetColumn[] = [],
  ): Observable<
    | ChartQueryResult
    | BarChartQueryResult
    | BoxPlotQueryResult
    | HistogramQueryResult
    | XBarRChartQueryResult
  > | null {
    const bindings = readChartBindings(config);
    const tooltipColumns = ChartQuery.namedTooltipColumns(config.tooltipColumns, columns);

    switch (config.type) {
      case 'barChart':
      case 'comboChart':
        return ChartQuery.barQuery(api, config, bindings, bindingFilters, tooltipColumns);
      case 'boxPlot':
        return ChartQuery.boxPlotQuery(api, config, bindings, bindingFilters, tooltipColumns);
      case 'xbarRChart':
        return ChartQuery.xBarRQuery(api, config, bindings, bindingFilters);
      case 'histogram':
        return ChartQuery.histogramQuery(api, config, bindings, bindingFilters, tooltipColumns);
      default:
        return ChartQuery.pointQuery(api, config, bindings, bindingFilters, tooltipColumns, cache);
    }
  }

  /** Bar and combo charts share one aggregate endpoint, queried once per bound binding. */
  private static barQuery(
    api: DatasetApiService,
    config: BarChartWidgetConfig | ComboChartWidgetConfig,
    bindings: ChartSeriesBinding[],
    bindingFilters: Record<string, FilterGroup | null> | null,
    tooltipColumns: ChartTooltipColumn[],
  ): Observable<BarChartQueryResult> | null {
    const needsValue = config.aggregate !== 'count';
    const parts = bindings
      .map((binding): Observable<BarChartPart | null> | null => {
        if (!binding.datasetId || !binding.xColumnId) {
          return null;
        }
        const valueColumnIds = barValueColumnIds(binding);
        if (needsValue && valueColumnIds.length === 0) {
          return null;
        }

        return api
          .queryBarChart(binding.datasetId, {
            filter: bindingFilters?.[binding.id] ?? null,
            categoryColumnId: binding.xColumnId,
            valueColumnIds: needsValue ? valueColumnIds : [],
            aggregate: config.aggregate,
            seriesColumnId: binding.seriesColumnId,
            toleranceBands: config.toleranceBands,
            sort: config.sort,
            categoryGrouping: config.categoryGrouping ?? null,
            tooltipColumns,
          })
          .pipe(
            map((result): BarChartPart => ({ binding, result })),
            // A failed binding drops out instead of blanking the chart.
            catchError(() => of(null)),
          );
      })
      .filter((part): part is Observable<BarChartPart | null> => part !== null);

    if (parts.length === 0) {
      return null;
    }

    return forkJoin(parts).pipe(
      map((results) => {
        const ok = results.filter((r): r is BarChartPart => r !== null);
        if (ok.length === 0) {
          throw new Error('Every chart dataset failed to load');
        }
        return {
          ...BarMerge.merge(ok, config.sort),
          failedBindingCount: results.length - ok.length,
        };
      }),
    );
  }

  private static boxPlotQuery(
    api: DatasetApiService,
    config: BoxPlotWidgetConfig,
    bindings: ChartSeriesBinding[],
    bindingFilters: Record<string, FilterGroup | null> | null,
    tooltipColumns: ChartTooltipColumn[],
  ): Observable<BoxPlotQueryResult> | null {
    const primary = bindings[0];
    if (!primary?.datasetId || !primary.xColumnId || !primary.yColumnId) {
      return null;
    }

    return api.queryBoxPlot(primary.datasetId, {
      filter: bindingFilters?.[primary.id] ?? null,
      categoryColumnId: primary.xColumnId,
      valueColumnId: primary.yColumnId,
      seriesColumnId: primary.seriesColumnId,
      whisker: config.whisker,
      whiskerFactor: config.whiskerFactor,
      sort: config.sort,
      includePoints: config.showPoints,
      toleranceBands: config.toleranceBands,
      categoryGrouping: config.categoryGrouping ?? null,
      tooltipColumns,
    });
  }

  private static xBarRQuery(
    api: DatasetApiService,
    config: XBarRChartWidgetConfig,
    bindings: ChartSeriesBinding[],
    bindingFilters: Record<string, FilterGroup | null> | null,
  ): Observable<XBarRChartQueryResult> | null {
    const primary = bindings[0];
    if (!primary?.datasetId || !primary.xColumnId || !primary.yColumnId) {
      return null;
    }

    return api.queryXBarRChart(primary.datasetId, {
      filter: bindingFilters?.[primary.id] ?? null,
      categoryColumnId: primary.xColumnId,
      valueColumnId: primary.yColumnId,
      sort: config.sort,
      toleranceBands: config.toleranceBands,
      categoryGrouping: config.categoryGrouping ?? null,
      mode: config.mode ?? 'xBarR',
      baselineSubgroups: config.baselineSubgroups ?? null,
      runRules: config.runRules ?? false,
    });
  }

  /** Each binding overlays its own distribution, on shared bin edges so bars line up. */
  private static histogramQuery(
    api: DatasetApiService,
    config: HistogramWidgetConfig,
    bindings: ChartSeriesBinding[],
    bindingFilters: Record<string, FilterGroup | null> | null,
    tooltipColumns: ChartTooltipColumn[],
  ): Observable<HistogramQueryResult> | null {
    const bound = bindings.filter((b) => b.datasetId && b.xColumnId);
    if (bound.length === 0) {
      return null;
    }

    // Only an auto-fit range or Auto bin count lets datasets pick different bins.
    const needsSharedEdges =
      bound.length > 1 &&
      (config.rangeMin == null || config.rangeMax == null || config.binMode === 'auto');

    if (!needsSharedEdges) {
      return ChartQuery.queryHistograms(
        api,
        config,
        bound,
        bindingFilters,
        tooltipColumns,
        {},
      ).pipe(map((results) => ChartQuery.histogramResult(results)));
    }

    // Probe each binding's natural bins, then re-query them on shared edges.
    return ChartQuery.queryHistograms(api, config, bound, bindingFilters, tooltipColumns, {}).pipe(
      switchMap((probe) => {
        const ok = probe.filter((r): r is HistogramPart => r !== null && r.result.bins.length > 0);
        if (ok.length === 0) {
          return of(ChartQuery.histogramResult(probe));
        }

        return ChartQuery.queryHistograms(
          api,
          config,
          bound,
          bindingFilters,
          tooltipColumns,
          ChartQuery.sharedBinOverrides(config, ok),
        ).pipe(map((results) => ChartQuery.histogramResult(results)));
      }),
    );
  }

  /** Pins every binding to the overall range and, for Auto bins, the finest probed count. */
  private static sharedBinOverrides(
    config: HistogramWidgetConfig,
    probed: readonly HistogramPart[],
  ): Partial<HistogramQueryRequest> {
    const rangeMin = config.rangeMin ?? Math.min(...probed.map((r) => r.result.bins[0].lower));
    const rangeMax =
      config.rangeMax ??
      Math.max(...probed.map((r) => r.result.bins[r.result.bins.length - 1].upper));
    if (config.binMode !== 'auto') {
      return { rangeMin, rangeMax };
    }
    const binCount = Math.max(...probed.map((r) => r.result.bins.length));
    return { rangeMin, rangeMax, binMode: 'count', binCount };
  }

  private static queryHistograms(
    api: DatasetApiService,
    config: HistogramWidgetConfig,
    bound: ChartSeriesBinding[],
    bindingFilters: Record<string, FilterGroup | null> | null,
    tooltipColumns: ChartTooltipColumn[],
    overrides: Partial<HistogramQueryRequest>,
  ): Observable<(HistogramPart | null)[]> {
    return forkJoin(
      bound.map((b) =>
        api
          .queryHistogram(b.datasetId!, {
            filter: bindingFilters?.[b.id] ?? null,
            valueColumnIds: histogramValueColumnIds(b),
            seriesColumnId: b.seriesColumnId,
            binMode: config.binMode,
            binCount: config.binCount,
            binWidth: config.binWidth,
            rangeMin: config.rangeMin,
            rangeMax: config.rangeMax,
            normalize: config.normalize,
            cumulative: config.cumulative,
            toleranceBands: config.toleranceBands,
            tooltipColumns,
            ...overrides,
          })
          .pipe(
            map((result): HistogramPart => ({ binding: b, result })),
            catchError(() => of(null)),
          ),
      ),
    );
  }

  private static histogramResult(results: (HistogramPart | null)[]): HistogramQueryResult {
    const ok = results.filter((r): r is HistogramPart => r !== null);
    if (ok.length === 0) {
      throw new Error('Every chart dataset failed to load');
    }
    return { ...HistogramMerge.merge(ok), failedBindingCount: results.length - ok.length };
  }

  private static pointQuery(
    api: DatasetApiService,
    config: ScatterChartWidgetConfig | LineChartWidgetConfig,
    bindings: ChartSeriesBinding[],
    bindingFilters: Record<string, FilterGroup | null> | null,
    tooltipColumns: ChartTooltipColumn[],
    cache: Map<string, ChartQueryResult> | undefined,
  ): Observable<ChartQueryResult> | null {
    const aggregate = config.type === 'lineChart' ? (config.aggregate ?? null) : null;
    const xGrouping = aggregate && config.type === 'lineChart' ? (config.xGrouping ?? null) : null;

    const wanted = new Set<string>();
    const parts = bindings
      .map((binding): Observable<ChartQueryPart | null> | null => {
        if (!binding.datasetId || !binding.xColumnId || !binding.yColumnId) {
          return null;
        }

        const request: ChartQueryRequest = {
          filter: bindingFilters?.[binding.id] ?? null,
          xColumnId: binding.xColumnId,
          yColumnId: binding.yColumnId,
          seriesColumnId: binding.seriesColumnId,
          sizeColumnId: binding.sizeColumnId ?? null,
          toleranceBands: config.toleranceBands,
          tooltipColumns,
          sort: binding.sort ?? null,
          showTrendLine: config.showTrendLine ?? false,
          aggregate,
          xGrouping,
        };
        const key = `${binding.datasetId}|${JSON.stringify(request)}`;
        wanted.add(key);

        return ChartQuery.cachedChart(api, binding.datasetId, request, key, cache).pipe(
          map((result): ChartQueryPart => ({ binding, result })),
          catchError(() => of(null)),
        );
      })
      .filter((part): part is Observable<ChartQueryPart | null> => part !== null);

    if (parts.length === 0) {
      return null;
    }

    if (cache) {
      for (const key of [...cache.keys()]) {
        if (!wanted.has(key)) {
          cache.delete(key);
        }
      }
    }

    return forkJoin(parts).pipe(
      map((results) => {
        const ok = results.filter((r): r is ChartQueryPart => r !== null);
        if (ok.length === 0) {
          throw new Error('Every chart dataset failed to load');
        }
        return { ...PointMerge.merge(ok), failedBindingCount: results.length - ok.length };
      }),
    );
  }

  private static cachedChart(
    api: DatasetApiService,
    datasetId: number,
    request: ChartQueryRequest,
    key: string,
    cache: Map<string, ChartQueryResult> | undefined,
  ): Observable<ChartQueryResult> {
    const cached = cache?.get(key);
    if (cached) {
      return of(cached);
    }
    return api.queryChart(datasetId, request).pipe(
      map((result) => {
        cache?.set(key, result);
        return result;
      }),
    );
  }

  private static namedTooltipColumns(
    tooltipColumns: readonly ChartTooltipColumn[] | undefined,
    columns: readonly DatasetColumn[],
  ): ChartTooltipColumn[] {
    return (tooltipColumns ?? []).map((t) => ({
      ...t,
      columnName: columns.find((c) => c.id === t.columnId)?.name ?? t.columnName,
    }));
  }
}

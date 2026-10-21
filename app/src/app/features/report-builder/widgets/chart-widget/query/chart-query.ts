import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import { DatasetColumn } from '../../../../../core/models/dataset';
import { FilterGroup } from '../../../../../core/models/filter';
import {
  BarChartWidgetConfig,
  BoxPlotWidgetConfig,
  ChartSeriesBinding,
  ChartSort,
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
  BarSeriesResult,
  BoxPlotQueryResult,
  ChartCategoryDetail,
  ChartQueryResult,
  ChartRowCounts,
  ChartSeriesResult,
  HistogramQueryRequest,
  HistogramQueryResult,
  HistogramSeriesResult,
  XBarRChartQueryResult,
} from '../../../../../core/models/widget-query';
import { ChartQueryPart } from './chart-query-part';
import { BarChartPart } from './bar-chart-part';
import { HistogramPart } from './histogram-part';

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
        if (!binding.datasetId || !binding.xColumnId) return null;
        const valueColumnIds = barValueColumnIds(binding);
        if (needsValue && valueColumnIds.length === 0) return null;

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

    if (parts.length === 0) return null;

    return forkJoin(parts).pipe(
      map((results) => {
        const ok = results.filter((r): r is BarChartPart => r !== null);
        if (ok.length === 0) throw new Error('Every chart dataset failed to load');
        return {
          ...ChartQuery.mergeBar(ok, config.sort),
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
    if (!primary?.datasetId || !primary.xColumnId || !primary.yColumnId) return null;

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
    if (!primary?.datasetId || !primary.xColumnId || !primary.yColumnId) return null;

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
    if (bound.length === 0) return null;

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

    // Probe each binding's natural bins, then pin all of them to the overall range and finest count.
    return ChartQuery.queryHistograms(api, config, bound, bindingFilters, tooltipColumns, {}).pipe(
      switchMap((probe) => {
        const ok = probe.filter((r): r is HistogramPart => r !== null && r.result.bins.length > 0);
        if (ok.length === 0) return of(ChartQuery.histogramResult(probe));

        const rangeMin = config.rangeMin ?? Math.min(...ok.map((r) => r.result.bins[0].lower));
        const rangeMax =
          config.rangeMax ??
          Math.max(...ok.map((r) => r.result.bins[r.result.bins.length - 1].upper));
        const sharedCount = Math.max(...ok.map((r) => r.result.bins.length));

        const finalOverrides =
          config.binMode === 'auto'
            ? { rangeMin, rangeMax, binMode: 'count' as const, binCount: sharedCount }
            : { rangeMin, rangeMax };

        return ChartQuery.queryHistograms(
          api,
          config,
          bound,
          bindingFilters,
          tooltipColumns,
          finalOverrides,
        ).pipe(map((results) => ChartQuery.histogramResult(results)));
      }),
    );
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
    if (ok.length === 0) throw new Error('Every chart dataset failed to load');
    return { ...ChartQuery.mergeHistogram(ok), failedBindingCount: results.length - ok.length };
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
        if (!binding.datasetId || !binding.xColumnId || !binding.yColumnId) return null;

        const request = {
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

        const cached = cache?.get(key);
        const source = cached
          ? of(cached)
          : api.queryChart(binding.datasetId, request).pipe(
              map((result) => {
                cache?.set(key, result);
                return result;
              }),
            );

        return source.pipe(
          map((result): ChartQueryPart => ({ binding, result })),
          catchError(() => of(null)),
        );
      })
      .filter((part): part is Observable<ChartQueryPart | null> => part !== null);

    if (parts.length === 0) return null;

    if (cache) for (const key of [...cache.keys()]) if (!wanted.has(key)) cache.delete(key);

    return forkJoin(parts).pipe(
      map((results) => {
        const ok = results.filter((r): r is ChartQueryPart => r !== null);
        if (ok.length === 0) throw new Error('Every chart dataset failed to load');
        return { ...ChartQuery.merge(ok), failedBindingCount: results.length - ok.length };
      }),
    );
  }

  /**
   * Flattens each binding's series into one result tagged by binding. With several bindings, each
   * series is named for its binding and repeated names are suffixed.
   */
  private static merge(parts: ChartQueryPart[]): ChartQueryResult {
    const first = parts[0].result;

    if (parts.length === 1) {
      const bindingId = parts[0].binding.id;
      return { ...first, series: first.series.map((s) => ({ ...s, bindingId })) };
    }

    const bases = parts.map(({ binding, result }) => binding.label.trim() || result.name);
    const counts = new Map<string, number>();
    for (const base of bases) counts.set(base, (counts.get(base) ?? 0) + 1);
    const seen = new Map<string, number>();
    const uniqueBases = bases.map((base) => {
      if ((counts.get(base) ?? 0) <= 1) return base;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return `${base} (${n})`;
    });

    const series: ChartSeriesResult[] = parts.flatMap((part, i) => {
      const { binding, result } = part;
      const base = uniqueBases[i];
      const split = result.series.length > 1;
      return result.series.map((s) => ({
        points: s.points,
        label: split && s.label ? `${base} · ${s.label}` : base,
        bindingId: binding.id,
      }));
    });

    const totalPoints = parts.reduce((sum, p) => sum + (p.result.totalPoints ?? 0), 0);
    const truncated = parts.some((p) => p.result.truncated);

    return {
      id: first.id,
      name: first.name,
      series,
      toleranceBands: first.toleranceBands,
      ...ChartQuery.sumRowCounts(parts),
      totalPoints,
      truncated,
      sampled: parts.some((p) => p.result.sampled),
    };
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

  /**
   * The merged category order. A natural sort is re-applied across every dataset (blank, then
   * "Other", last). A column sort's metric exists only on the primary dataset, so its order leads.
   */
  private static mergedCategoryOrder(
    categories: string[],
    details: (ChartCategoryDetail | undefined)[],
    sort: ChartSort | undefined,
  ): number[] {
    const indices = categories.map((_, i) => i);
    if (sort?.by === 'column') return indices;
    const sorted = [...indices].sort((a, b) => {
      const da = details[a];
      const db = details[b];
      const byRank = ChartQuery.categoryRank(da) - ChartQuery.categoryRank(db);
      if (byRank !== 0) return byRank;
      if (da?.sortNumber != null && db?.sortNumber != null) return da.sortNumber - db.sortNumber;
      const ta = da?.sortText ?? categories[a];
      const tb = db?.sortText ?? categories[b];
      return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
    });
    if (!sort?.descending) return sorted;
    // Descending keeps blank and "Other" at the end.
    const real = sorted.filter((i) => ChartQuery.categoryRank(details[i]) === 0).reverse();
    return [...real, ...sorted.filter((i) => ChartQuery.categoryRank(details[i]) !== 0)];
  }

  /** Re-indexes one binding's values onto the merged axis, filling `missing` for gaps. */
  private static reindex<T>(
    categories: readonly string[],
    localIndex: ReadonlyMap<string, number>,
    values: readonly T[] | undefined,
    missing: T,
  ): T[] {
    return categories.map((category) => {
      const i = localIndex.get(category);
      return i === undefined ? missing : (values?.[i] ?? missing);
    });
  }

  private static categoryRank(detail: ChartCategoryDetail | undefined): number {
    return detail?.isOther ? 2 : detail?.isBlank ? 1 : 0;
  }

  /**
   * Merges each binding's bar response onto one category axis, re-indexing values and filling null
   * for gaps. Legend labels compose binding, measure and split from only the parts that vary, and
   * repeats are suffixed.
   */
  private static mergeBar(parts: BarChartPart[], sort?: ChartSort): BarChartQueryResult {
    const first = parts[0].result;
    const multiBinding = parts.length > 1;

    // With several datasets, re-sort the union so a later dataset's categories don't just trail.
    const unionCategories: string[] = [];
    const unionDetails: (ChartCategoryDetail | undefined)[] = [];
    const seenCategories = new Set<string>();
    for (const { result } of parts) {
      result.categories.forEach((category, i) => {
        if (seenCategories.has(category)) return;
        seenCategories.add(category);
        unionCategories.push(category);
        unionDetails.push(result.categoryDetails?.[i]);
      });
    }
    const order = multiBinding
      ? ChartQuery.mergedCategoryOrder(unionCategories, unionDetails, sort)
      : unionCategories.map((_, i) => i);
    const categories = order.map((i) => unionCategories[i]);
    const categoryDetails = order.map((i) => unionDetails[i] ?? {});

    const series: BarSeriesResult[] = parts.flatMap(({ binding, result }) => {
      const base = binding.label.trim() || result.name;
      const measureIds = new Set(result.series.map((s) => s.valueColumnId ?? ''));
      const multiMeasure = measureIds.size > 1;
      const hasSplit = result.series.some((s) => s.label !== '');

      const localIndex = new Map(result.categories.map((c, i) => [c, i]));

      return result.series.map((s): BarSeriesResult => {
        const labelParts: string[] = [];
        if (multiBinding) labelParts.push(base);
        if (multiMeasure) labelParts.push(s.valueColumnLabel || 'Value');
        if (hasSplit) labelParts.push(s.label || '(blank)');
        const label =
          labelParts.length > 0 ? labelParts.join(' · ') : base || s.valueColumnLabel || 'Value';

        return {
          label,
          bindingId: binding.id,
          valueColumnId: s.valueColumnId,
          drill: s.drill ?? null,
          values: ChartQuery.reindex(categories, localIndex, s.values, null),
          rowCounts: ChartQuery.reindex(categories, localIndex, s.rowCounts, null),
          tooltipLines: ChartQuery.reindex(categories, localIndex, s.tooltipLines, [] as string[]),
          // Drill conditions name this binding's own dataset's columns.
          categoryDrills: ChartQuery.reindex(
            categories,
            localIndex,
            result.categoryDetails?.map((d) => d.drill ?? null),
            null as FilterGroup | null,
          ),
        };
      });
    });

    const counts = new Map<string, number>();
    for (const s of series) counts.set(s.label, (counts.get(s.label) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const s of series) {
      if ((counts.get(s.label) ?? 0) <= 1) continue;
      const n = (seen.get(s.label) ?? 0) + 1;
      seen.set(s.label, n);
      s.label = `${s.label} (${n})`;
    }

    return {
      id: first.id,
      name: first.name,
      categories,
      categoryDetails,
      series,
      // Bands resolve against the primary binding's dataset, matching the panel's schema.
      toleranceBands: first.toleranceBands,
      ...ChartQuery.sumRowCounts(parts),
    };
  }

  /**
   * Flattens each binding's distribution into one result. The caller has already aligned their
   * bins, so the first binding with data supplies the axis. Labels compose like the bar overlay's.
   */
  private static mergeHistogram(parts: HistogramPart[]): HistogramQueryResult {
    const first = parts[0].result;
    const multiBinding = parts.length > 1;

    const basis = parts.find((p) => p.result.bins.length > 0) ?? parts[0];

    const series: HistogramSeriesResult[] = parts.flatMap(({ binding, result }) => {
      const base = binding.label.trim() || result.name;
      const measureIds = new Set(result.series.map((s) => s.valueColumnId ?? ''));
      const multiMeasure = measureIds.size > 1;
      const hasSplit = result.series.some((s) => s.label !== '');

      return result.series.map((s): HistogramSeriesResult => {
        const labelParts: string[] = [];
        if (multiBinding) labelParts.push(base);
        if (multiMeasure) labelParts.push(s.valueColumnLabel || 'Value');
        if (hasSplit) labelParts.push(s.label || '(blank)');
        const label =
          labelParts.length > 0 ? labelParts.join(' · ') : base || s.valueColumnLabel || 'Value';

        return { ...s, label, bindingId: binding.id };
      });
    });

    const counts = new Map<string, number>();
    for (const s of series) counts.set(s.label, (counts.get(s.label) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const s of series) {
      if ((counts.get(s.label) ?? 0) <= 1) continue;
      const n = (seen.get(s.label) ?? 0) + 1;
      seen.set(s.label, n);
      s.label = `${s.label} (${n})`;
    }

    return {
      id: first.id,
      name: first.name,
      bins: basis.result.bins,
      series,
      // Every binding resolves the same spec, so the first non-empty bounds stand for all.
      toleranceBands: basis.result.toleranceBands,
      ...ChartQuery.sumRowCounts(parts),
      truncated: parts.some((p) => p.result.truncated),
      scannedRowCount: parts.reduce((sum, p) => sum + (p.result.scannedRowCount ?? 0), 0),
    };
  }

  /**
   * Row counts for the footer, counting each dataset once. Bindings sharing a dataset contribute the
   * widest slice any of them plots.
   */
  private static sumRowCounts(
    parts: { binding: ChartSeriesBinding; result: ChartRowCounts }[],
  ): ChartRowCounts {
    const byDataset = new Map<number | null, ChartRowCounts>();
    for (const { binding, result } of parts) {
      const seen = byDataset.get(binding.datasetId);
      byDataset.set(binding.datasetId, {
        totalRowCount: result.totalRowCount,
        matchedRowCount: Math.max(seen?.matchedRowCount ?? 0, result.matchedRowCount),
      });
    }

    let totalRowCount = 0;
    let matchedRowCount = 0;
    for (const counts of byDataset.values()) {
      totalRowCount += counts.totalRowCount;
      matchedRowCount += counts.matchedRowCount;
    }
    return { totalRowCount, matchedRowCount };
  }
}

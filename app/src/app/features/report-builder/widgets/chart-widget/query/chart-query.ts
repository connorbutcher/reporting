import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import { DatasetColumn } from '../../../../../core/models/dataset';
import { FilterGroup } from '../../../../../core/models/filter';
import {
  ChartSeriesBinding,
  ChartSort,
  ChartTooltipColumn,
  ChartWidgetConfig,
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

/** One binding's point-chart response, tagged with the binding it came from. */
interface ChartQueryPart {
  binding: ChartSeriesBinding;
  result: ChartQueryResult;
}

/** One binding's bar-chart response, tagged with the binding it came from. */
interface BarChartPart {
  binding: ChartSeriesBinding;
  result: BarChartQueryResult;
}

/** One binding's histogram response, tagged with the binding it came from. */
interface HistogramPart {
  binding: ChartSeriesBinding;
  result: HistogramQueryResult;
}

/** Builds the server query for a chart's current config. */
export class ChartQuery {
  /**
   * Returns null when there isn't enough bound to ask. A bar chart aggregates a single dataset
   * server-side (one endpoint, its first binding only). Point charts fan out one query per bound
   * binding, each on its own dataset, and merge the returned series client-side.
   *
   * `bindingFilters` maps each binding's id to its fully-resolved, query-safe filter so a
   * half-typed condition doesn't blank the chart; a binding absent from the map plots unfiltered.
   *
   * `cache`, when supplied, memoizes each binding's response by its full request so editing one
   * binding doesn't refetch the others. It is pruned to the current binding set each call.
   *
   * `columns` is the axis-defining (first bound) dataset's schema, which the tooltip columns were
   * picked from; each is sent with its name so other datasets can resolve their own column of it.
   */
  public static build(
    api: DatasetApiService,
    config: ChartWidgetConfig,
    bindingFilters: Record<string, FilterGroup | null> | null,
    cache?: Map<string, ChartQueryResult>,
    columns: readonly DatasetColumn[] = [],
  ): Observable<
    ChartQueryResult | BarChartQueryResult | BoxPlotQueryResult | HistogramQueryResult | XBarRChartQueryResult
  > | null {
    const bindings = readChartBindings(config);
    const tooltipColumns = ChartQuery.namedTooltipColumns(config.tooltipColumns, columns);

    if (config.type === 'barChart' || config.type === 'comboChart') {
      // A combo chart shares the bar chart's aggregate-per-category data model — bars and lines
      // both plot one value per category — so it queries through the very same endpoint and merge;
      // only the client-side rendering differs. Fan out one aggregate query per bound binding, each
      // on its own dataset, and align their categories client-side.
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
              // Isolate one binding's failure so a bad dataset drops out instead of blanking the chart;
              // the merge counts the drop-outs so the widget can say a series is missing.
              catchError(() => of(null)),
            );
        })
        .filter((part): part is Observable<BarChartPart | null> => part !== null);

      if (parts.length === 0) return null;

      return forkJoin(parts).pipe(
        map((results) => {
          const ok = results.filter((r): r is BarChartPart => r !== null);
          if (ok.length === 0) throw new Error('Every chart dataset failed to load');
          return { ...ChartQuery.mergeBar(ok, config.sort), failedBindingCount: results.length - ok.length };
        }),
      );
    }

    if (config.type === 'boxPlot') {
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
      });
    }

    if (config.type === 'xbarRChart') {
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

    if (config.type === 'histogram') {
      // Each bound binding overlays its own distribution — its own dataset and column, reading
      // xColumnId as the value being binned. A single binding queries exactly as before; several
      // are bound onto one shared set of bin edges (below) so their bars line up on one axis.
      const bound = bindings.filter((b) => b.datasetId && b.xColumnId);
      if (bound.length === 0) return null;

      const request = (b: ChartSeriesBinding, overrides?: Partial<HistogramQueryRequest>): HistogramQueryRequest => ({
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
        ...overrides,
      });

      const queryAll = (
        overridesFor: (b: ChartSeriesBinding) => Partial<HistogramQueryRequest>,
      ): Observable<(HistogramPart | null)[]> =>
        forkJoin(
          bound.map((b) =>
            api.queryHistogram(b.datasetId!, request(b, overridesFor(b))).pipe(
              map((result): HistogramPart => ({ binding: b, result })),
              // Isolate one binding's failure so a bad dataset drops out instead of blanking the chart.
              catchError(() => of(null)),
            ),
          ),
        );

      const toResult = (results: (HistogramPart | null)[]): HistogramQueryResult => {
        const ok = results.filter((r): r is HistogramPart => r !== null);
        if (ok.length === 0) throw new Error('Every chart dataset failed to load');
        return { ...ChartQuery.mergeHistogram(ok), failedBindingCount: results.length - ok.length };
      };

      // A lone binding needs no shared range or bin count to agree with — query it exactly as
      // before. Several only need the extra probe-and-align round trip when something about the
      // bins would otherwise be decided independently per dataset: an auto-fit range, or Auto mode's
      // data-driven bin count.
      const needsSharedEdges =
        bound.length > 1 && (config.rangeMin == null || config.rangeMax == null || config.binMode === 'auto');

      if (!needsSharedEdges) {
        return queryAll(() => ({})).pipe(map(toResult));
      }

      // Probe pass: each binding's own natural bins, to learn the overall data range (for an
      // auto-fit bound) and the finest Auto bin count among them. The final pass pins every
      // binding to that shared range — and, for Auto mode, to that shared count via an explicit
      // Count override — so every series' edges come out identical.
      return queryAll(() => ({})).pipe(
        switchMap((probe) => {
          const ok = probe.filter((r): r is HistogramPart => r !== null && r.result.bins.length > 0);
          if (ok.length === 0) return of(toResult(probe));

          const rangeMin = config.rangeMin ?? Math.min(...ok.map((r) => r.result.bins[0].lower));
          const rangeMax =
            config.rangeMax ?? Math.max(...ok.map((r) => r.result.bins[r.result.bins.length - 1].upper));
          const sharedCount = Math.max(...ok.map((r) => r.result.bins.length));

          const finalOverrides =
            config.binMode === 'auto'
              ? { rangeMin, rangeMax, binMode: 'count' as const, binCount: sharedCount }
              : { rangeMin, rangeMax };

          return queryAll(() => finalOverrides).pipe(map(toResult));
        }),
      );
    }

    // A line chart can reduce every row sharing an X value to one point.
    const aggregate = config.type === 'lineChart' ? (config.aggregate ?? null) : null;
    const xGrouping = aggregate ? (config.type === 'lineChart' ? (config.xGrouping ?? null) : null) : null;

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
          // Picked from the first dataset's schema; other datasets resolve them by name.
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
          // Isolate one binding's failure: a bad dataset drops out (null, filtered in the merge)
          // instead of blanking the whole overlay.
          catchError(() => of(null)),
        );
      })
      .filter((part): part is Observable<ChartQueryPart | null> => part !== null);

    if (parts.length === 0) return null;

    // Drop cache entries for bindings no longer in play, so the map stays bounded.
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
   * Flattens each binding's series into one result, tagging every series with its binding's id.
   * A single binding keeps its series and name untouched. With several, each series is named for
   * its binding (label, else dataset name), colliding names suffixed so the legend can tell them
   * apart. Presentation is left to the option builder, which resolves it live from each binding.
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
    // Suffix only names that actually repeat; unique names are left bare.
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
        // A colour-by split keeps both parts of the name; otherwise the binding name alone.
        label: split && s.label ? `${base} · ${s.label}` : base,
        bindingId: binding.id,
      }));
    });

    // Roll per-binding point counts up so the widget can report the overlay's total.
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

  /** The tooltip columns, each tagged with its column's name so another dataset can resolve it. */
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
   * The order a merged category axis takes. A default (natural) sort is re-applied across every
   * dataset's categories — numbers and dates by value, text alphabetically, blank then "Other" last —
   * so a category only one dataset has lands in its natural place, not at the end. A column sort's
   * metric exists only on the primary dataset, so its order leads and the rest follow, as the server
   * sinks categories with no metric.
   */
  private static mergedCategoryOrder(
    categories: string[],
    details: (ChartCategoryDetail | undefined)[],
    sort: ChartSort | undefined,
  ): number[] {
    const indices = categories.map((_, i) => i);
    if (sort?.by === 'column') return indices;
    const rank = (d: ChartCategoryDetail | undefined): number => (d?.isOther ? 2 : d?.isBlank ? 1 : 0);
    const sorted = [...indices].sort((a, b) => {
      const da = details[a];
      const db = details[b];
      const byRank = rank(da) - rank(db);
      if (byRank !== 0) return byRank;
      if (da?.sortNumber != null && db?.sortNumber != null) return da.sortNumber - db.sortNumber;
      const ta = da?.sortText ?? categories[a];
      const tb = db?.sortText ?? categories[b];
      return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
    });
    if (!sort?.descending) return sorted;
    // Descending reverses the real categories but keeps blank and "Other" at the end.
    const real = sorted.filter((i) => rank(details[i]) === 0).reverse();
    return [...real, ...sorted.filter((i) => rank(details[i]) !== 0)];
  }

  /**
   * Merges each binding's bar response onto one shared category axis: the categories are unioned
   * in first-seen order (the first binding's ordering leads, novel categories from later bindings
   * append), and every series' values are re-indexed onto it, filling null where a binding lacks a
   * category. Each series is tagged with its binding (for its stack group and colour) and given a
   * composed legend label — binding · measure · split — carrying only the parts that actually vary.
   * Colliding labels are suffixed so the legend and colour palette can still tell them apart.
   */
  private static mergeBar(parts: BarChartPart[], sort?: ChartSort): BarChartQueryResult {
    const first = parts[0].result;
    const multiBinding = parts.length > 1;

    // Union the categories (first binding's order first), then — with several datasets — re-sort
    // the union so categories only a later dataset has don't simply trail at the end.
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
      // Which naming parts vary within this binding: several measures, or a colour-by split.
      const measureIds = new Set(result.series.map((s) => s.valueColumnId ?? ''));
      const multiMeasure = measureIds.size > 1;
      const hasSplit = result.series.some((s) => s.label !== '');

      // This binding's own category positions, to re-index its values onto the unified axis.
      const localIndex = new Map(result.categories.map((c, i) => [c, i]));

      return result.series.map((s): BarSeriesResult => {
        const labelParts: string[] = [];
        if (multiBinding) labelParts.push(base);
        if (multiMeasure) labelParts.push(s.valueColumnLabel || 'Value');
        if (hasSplit) labelParts.push(s.label || '(blank)');
        // Nothing varies (one binding, one measure, no split): fall back to a sensible single name.
        const label = labelParts.length > 0 ? labelParts.join(' · ') : base || s.valueColumnLabel || 'Value';

        const reindex = <T>(values: readonly T[] | undefined, missing: T): T[] =>
          categories.map((category) => {
            const i = localIndex.get(category);
            return i === undefined ? missing : (values?.[i] ?? missing);
          });
        return {
          label,
          bindingId: binding.id,
          valueColumnId: s.valueColumnId,
          drill: s.drill ?? null,
          values: reindex(s.values, null),
          rowCounts: reindex(s.rowCounts, null),
          tooltipLines: reindex(s.tooltipLines, [] as string[]),
          // Drill conditions name this binding's own dataset's columns, so each series keeps its own.
          categoryDrills: reindex(
            result.categoryDetails?.map((d) => d.drill ?? null),
            null as FilterGroup | null,
          ),
        };
      });
    });

    // Suffix only labels that actually repeat, so the palette keys stay distinct.
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
      // Bands resolve against the primary binding's dataset, matching the schema the panel offers.
      toleranceBands: first.toleranceBands,
      ...ChartQuery.sumRowCounts(parts),
    };
  }

  /**
   * Flattens each binding's distribution into one result: their bins are assumed identical (the
   * caller aligns them onto a shared range and bin count before querying, needed only when more
   * than one binding is in play) — the first binding with any data stands in for the shared axis.
   * Each series is given a composed legend label — binding · measure · split — carrying only the
   * parts that actually vary, mirroring how a bar chart's overlay composes its own legend.
   * Colliding labels are suffixed so the legend and colour palette can still tell them apart.
   */
  private static mergeHistogram(parts: HistogramPart[]): HistogramQueryResult {
    const first = parts[0].result;
    const multiBinding = parts.length > 1;

    const basis = parts.find((p) => p.result.bins.length > 0) ?? parts[0];

    const series: HistogramSeriesResult[] = parts.flatMap(({ binding, result }) => {
      const base = binding.label.trim() || result.name;
      // Which naming parts vary within this binding: several value columns, or a colour-by split.
      const measureIds = new Set(result.series.map((s) => s.valueColumnId ?? ''));
      const multiMeasure = measureIds.size > 1;
      const hasSplit = result.series.some((s) => s.label !== '');

      return result.series.map((s): HistogramSeriesResult => {
        const labelParts: string[] = [];
        if (multiBinding) labelParts.push(base);
        if (multiMeasure) labelParts.push(s.valueColumnLabel || 'Value');
        if (hasSplit) labelParts.push(s.label || '(blank)');
        // Nothing varies (one binding, one column, no split): fall back to a sensible single name.
        const label = labelParts.length > 0 ? labelParts.join(' · ') : base || s.valueColumnLabel || 'Value';

        return { ...s, label, bindingId: binding.id };
      });
    });

    // Suffix only labels that actually repeat, so the palette keys stay distinct.
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
      // Bands resolve against each binding's own dataset but the same spec, so every binding's
      // response carries the same resolved bounds — the first (non-empty) one stands for all.
      toleranceBands: basis.result.toleranceBands,
      ...ChartQuery.sumRowCounts(parts),
      // Any binding's scan hitting its cap makes the overlay incomplete; the rows actually read
      // add up across bindings the same way the matched/total counts do.
      truncated: parts.some((p) => p.result.truncated),
      scannedRowCount: parts.reduce((sum, p) => sum + (p.result.scannedRowCount ?? 0), 0),
    };
  }

  /**
   * The overlay's row counts for the "N of M rows" footer: each dataset counted once, summed across
   * datasets. Bindings on the same dataset read the same rows, so they must not double the total;
   * where their filters differ, the widest slice any of them plots stands for the dataset.
   */
  private static sumRowCounts(parts: { binding: ChartSeriesBinding; result: ChartRowCounts }[]): ChartRowCounts {
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

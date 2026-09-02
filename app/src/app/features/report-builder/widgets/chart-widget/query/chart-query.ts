import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../../core/models/filter';
import { ChartSeriesBinding, ChartWidgetConfig, readChartBindings } from '../../../../../core/models/report';
import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  ChartQueryResult,
  ChartSeriesResult,
} from '../../../../../core/models/widget-query';

/** One binding's point-chart response, tagged with the binding it came from. */
interface ChartQueryPart {
  binding: ChartSeriesBinding;
  result: ChartQueryResult;
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
   */
  public static build(
    api: DatasetApiService,
    config: ChartWidgetConfig,
    bindingFilters: Record<string, FilterGroup | null> | null,
    cache?: Map<string, ChartQueryResult>,
  ): Observable<ChartQueryResult | BarChartQueryResult | BoxPlotQueryResult> | null {
    const bindings = readChartBindings(config);

    if (config.type === 'barChart') {
      const primary = bindings[0];
      if (!primary?.datasetId) return null;
      const category = primary.xColumnId;
      if (!category) return null;
      const needsValue = config.aggregate !== 'count';
      if (needsValue && !primary.yColumnId) return null;

      return api.queryBarChart(primary.datasetId, {
        filter: bindingFilters?.[primary.id] ?? null,
        categoryColumnId: category,
        valueColumnId: needsValue ? primary.yColumnId : null,
        aggregate: config.aggregate,
        seriesColumnId: primary.seriesColumnId,
        toleranceBands: config.toleranceBands,
      });
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
      });
    }

    // Tooltip columns are chosen from the axis-defining dataset's schema (the first bound
    // binding), so they only make sense there — other datasets don't have those column ids.
    const axisBindingId = bindings.find((b) => b.datasetId)?.id;

    const wanted = new Set<string>();
    const parts = bindings
      .map((binding): Observable<ChartQueryPart | null> | null => {
        if (!binding.datasetId || !binding.xColumnId || !binding.yColumnId) return null;

        const request = {
          filter: bindingFilters?.[binding.id] ?? null,
          xColumnId: binding.xColumnId,
          yColumnId: binding.yColumnId,
          seriesColumnId: binding.seriesColumnId,
          toleranceBands: config.toleranceBands,
          tooltipColumns: binding.id === axisBindingId ? config.tooltipColumns : [],
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
        return ChartQuery.merge(ok);
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
      totalPoints,
      truncated,
    };
  }
}

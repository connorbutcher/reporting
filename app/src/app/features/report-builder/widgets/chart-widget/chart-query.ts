import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter';
import {
  ChartSeriesBinding,
  ChartWidgetConfig,
  readChartBindings,
} from '../../../../core/models/report';
import {
  BarChartQueryResult,
  ChartQueryResult,
  ChartSeriesResult,
} from '../../../../core/models/widget-query';

/** One binding's point-chart response, tagged with the binding it came from. */
interface ChartQueryPart {
  binding: ChartSeriesBinding;
  result: ChartQueryResult;
}

/**
 * Builds the query for a chart's current config, or returns null when there
 * isn't enough bound to ask (no dataset, missing axes).
 *
 * A bar chart groups and aggregates a single dataset server-side, so it hits a
 * different endpoint from its first binding only — overlaying datasets on bars
 * isn't supported, since their categories wouldn't align. Point charts (scatter
 * and line) instead fan out one query per bound binding, each on its own
 * dataset, and merge the returned series client-side.
 *
 * `bindingFilters` maps each binding's id to its fully-resolved, query-safe
 * filter — the report-level filter for its dataset layered under the binding's
 * own (with the live edit override, in the builder) — so a half-typed condition
 * doesn't blank the chart. A binding absent from the map plots unfiltered.
 *
 * `cache`, when supplied, memoizes each binding's response by its full request so
 * editing one binding (a filter, an axis) doesn't refetch the others. It is
 * pruned to the current binding set each call, and the caller clears it when the
 * dataset version changes.
 */
export function buildChartQuery(
  api: DatasetApiService,
  config: ChartWidgetConfig,
  bindingFilters: Record<string, FilterGroup | null> | null,
  cache?: Map<string, ChartQueryResult>,
): Observable<ChartQueryResult | BarChartQueryResult> | null {
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

  // Tooltip columns are chosen from the axis-defining dataset's schema (the first
  // bound binding), so they only make sense there — other datasets don't have
  // those column ids, and sending them would error or return empty tooltips.
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
        // Isolate one binding's failure: a single bad dataset drops out (null,
        // filtered in the merge) instead of blanking the whole overlay.
        catchError(() => of(null)),
      );
    })
    .filter((part): part is Observable<ChartQueryPart | null> => part !== null);

  if (parts.length === 0) return null;

  // Drop cache entries for bindings no longer in play, so the map stays bounded
  // to the current set rather than growing with every filter edit.
  if (cache) for (const key of [...cache.keys()]) if (!wanted.has(key)) cache.delete(key);

  return forkJoin(parts).pipe(
    map((results) => {
      const ok = results.filter((r): r is ChartQueryPart => r !== null);
      if (ok.length === 0) throw new Error('Every chart dataset failed to load');
      return mergeChartResults(ok);
    }),
  );
}

/**
 * Flattens each binding's series into one result. A single binding is returned
 * untouched, so a one-dataset chart behaves exactly as it did before the
 * fan-out. With several, each series is named for its binding — its label, else
 * its dataset name — with colliding names suffixed so echarts' name-keyed legend
 * can still tell overlaid datasets apart.
 */
function mergeChartResults(parts: ChartQueryPart[]): ChartQueryResult {
  const first = parts[0].result;
  if (parts.length === 1) return first;

  const bases = parts.map(({ binding, result }) => binding.label.trim() || result.name);
  const counts = new Map<string, number>();
  for (const base of bases) counts.set(base, (counts.get(base) ?? 0) + 1);
  const seen = new Map<string, number>();
  // Suffix only names that actually repeat (same dataset overlaid twice, or two
  // like-named datasets); unique names are left bare.
  const uniqueBases = bases.map((base) => {
    if ((counts.get(base) ?? 0) <= 1) return base;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base} (${n})`;
  });

  const series: ChartSeriesResult[] = parts.flatMap(({ result }, i) => {
    const base = uniqueBases[i];
    const split = result.series.length > 1;
    return result.series.map((s) => ({
      points: s.points,
      // When a binding already splits into sub-series (colour-by), keep both
      // parts of the name; otherwise the binding name alone names the series.
      label: split && s.label ? `${base} · ${s.label}` : base,
    }));
  });

  return { id: first.id, name: first.name, series, toleranceBands: first.toleranceBands };
}

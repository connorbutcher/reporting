import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ButtonModule } from 'primeng/button';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter';
import { ChartWidgetConfig, readChartBindings } from '../../../../core/models/report';
import { widgetTypeDescriptor } from '../../../../core/models/widget-catalog';
import { BarChartQueryResult, BoxPlotQueryResult, ChartQueryResult } from '../../../../core/models/widget-query';
import { WidgetDataSource } from '../widget-data-source';
import { BoxOption } from './options/box-option';
import { ChartExport } from './chart-export';
import { BarOption } from './options/bar-option';
import { ECOption } from './options/chart-option.types';
import { PointOption } from './options/point-option';
import { SeriesPalette } from './options/series-colors';
import { ChartQuery } from './query/chart-query';

/**
 * Renders a scatter, line, or bar chart. This host owns only the shared plumbing — inputs, the
 * data source, and reload triggers; each chart kind's query shape lives in {@link ChartQuery}
 * and its echarts options in {@link PointOption}/{@link BarOption}.
 */
@Component({
  selector: 'app-chart-widget',
  imports: [NgxEchartsDirective, ButtonModule],
  templateUrl: './chart-widget.component.html',
  styleUrl: './chart-widget.component.scss',
})
export class ChartWidgetComponent {
  public readonly config = input.required<ChartWidgetConfig>();
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  public readonly datasetVersion = input(0);
  /**
   * Each binding's fully-resolved, query-safe filter (the report-level filter for
   * its dataset layered under the binding's own), keyed by binding id. Resolved by
   * the host so the builder can drop conditions the user is still typing; a binding
   * absent from the map plots unfiltered.
   */
  public readonly bindingFilters = input<Record<string, FilterGroup | null> | null>(null);

  /** Icon for the empty state, so each chart kind shows its own glyph. */
  public readonly placeholderIcon = computed(() => widgetTypeDescriptor(this.config().type).icon);

  /** Null until there's a dataset and enough columns bound to actually plot. */
  public readonly chartOption = computed<ECOption | null>(() => {
    const config = this.config();
    const columns = this.source.columns();
    const data = this.source.result();
    const colors = this.seriesColors();
    switch (config.type) {
      case 'barChart':
        return BarOption.build(config, data as BarChartQueryResult | null, columns, colors);
      case 'boxPlot':
        return BoxOption.build(config, data as BoxPlotQueryResult | null, columns, colors);
      default:
        return PointOption.build(config, data as ChartQueryResult | null, columns, colors);
    }
  });

  /** A "showing N of M points" note when the server capped a point chart's data, else null. */
  public readonly truncationNote = computed<string | null>(() => {
    // Only point charts (scatter/line) cap their rows; bar and box aggregate server-side.
    if (!this.isPointChart()) return null;
    const result = this.source.result() as ChartQueryResult | null;
    if (!result?.truncated) return null;
    const plotted = result.series.reduce((n, s) => n + s.points.length, 0);
    const total = result.totalPoints ?? plotted;
    return `Showing ${plotted.toLocaleString()} of ${total.toLocaleString()} points`;
  });

  /** Prompt shown when the chart isn't configured enough to plot, worded per kind. */
  public readonly configHint = computed(() => {
    switch (this.config().type) {
      case 'barChart':
        return 'Pick a category column in the side panel.';
      case 'boxPlot':
        return 'Pick a category and a value column in the side panel.';
      default:
        return 'Pick an X and a Y column in the side panel.';
    }
  });

  /**
   * The single display state the template renders: a dataset prompt, a config
   * prompt, a load error, a first-load spinner, an empty-result notice, or the
   * chart itself.
   */
  public readonly view = computed<'noDataset' | 'needsConfig' | 'error' | 'loading' | 'empty' | 'ready'>(
    () => {
      if (!this.datasetId()) return 'noDataset';
      if (this.error()) return 'error';
      if (!this.configured()) return 'needsConfig';
      // A first load (nothing shown yet) gets a spinner; a reload keeps the chart.
      if (this.loading() && this.source.result() === null) return 'loading';
      return this.empty() ? 'empty' : 'ready';
    },
  );

  /** A reload while a chart is already on screen — dims it rather than blanking to a spinner. */
  public readonly reloading = computed(() => this.loading() && this.source.result() !== null);

  private readonly datasetApi = inject(DatasetApiService);

  /** Whether this is a point chart (scatter/line) — as opposed to an aggregating bar or box plot. */
  private readonly isPointChart = computed(() => {
    const type = this.config().type;
    return type !== 'barChart' && type !== 'boxPlot';
  });

  /**
   * The first *bound* binding's dataset drives the loaded schema — it names the
   * shared axes. Using the first bound one (not strictly bindings[0]) means the
   * chart still renders when an earlier binding is left unconfigured.
   */
  private readonly datasetId = computed(
    () => readChartBindings(this.config()).find((b) => b.datasetId)?.datasetId ?? null,
  );

  /**
   * A signature of just the config fields the server query depends on — each
   * binding's dataset and columns, the bar aggregate, the tolerance bands, and the
   * tooltip columns. The reload effect watches this rather than the whole config,
   * so appearance-only edits (axis labels, colours, zoom, markers, bounds) don't
   * fire a needless reload that would briefly dim the chart.
   */
  private readonly queryKey = computed(() => {
    const config = this.config();
    const bindings = readChartBindings(config).map((b) => [
      b.datasetId,
      b.xColumnId,
      b.yColumnId,
      b.seriesColumnId,
    ]);
    const aggregate = config.type === 'barChart' ? config.aggregate : null;
    // Box options that change the server response: whisker mode/length (which values become
    // outliers), the sort order, and whether raw points are pulled. Mean/n/capability/highlighting
    // are render-only (the summary always carries mean & σ), so they don't force a reload.
    const box =
      config.type === 'boxPlot'
        ? { w: config.whisker, f: config.whiskerFactor, s: config.sort, p: config.showPoints }
        : null;
    return JSON.stringify({ bindings, aggregate, box, tol: config.toleranceBands, tip: config.tooltipColumns });
  });

  /** Per-binding response cache so editing one binding doesn't refetch the others. */
  private readonly queryCache = new Map<string, ChartQueryResult>();

  private readonly source = new WidgetDataSource<ChartQueryResult | BarChartQueryResult | BoxPlotQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    fetch: () =>
      ChartQuery.build(this.datasetApi, this.config(), this.bindingFilters(), this.queryCache),
  });

  private readonly loading = this.source.loading;
  private readonly error = this.source.error;

  /**
   * Remembers each series' colour across rebuilds so adding or removing one series
   * doesn't reshuffle the rest. One per chart instance; updated from an effect (a
   * side effect, so it stays out of the pure `chartOption` computed) into
   * {@link seriesColors}.
   */
  private readonly palette = new SeriesPalette();
  private readonly seriesColors = signal<Map<string, string>>(new Map());

  /**
   * Whether the chart is set up enough to query — read from the config, not the
   * built option, so schema still loading doesn't read as "not configured".
   */
  private readonly configured = computed(() => {
    const config = this.config();
    const bindings = readChartBindings(config);
    if (config.type === 'barChart') {
      const b = bindings[0];
      return !!(b?.datasetId && b.xColumnId && (config.aggregate === 'count' || b.yColumnId));
    }
    if (config.type === 'boxPlot') {
      const b = bindings[0];
      return !!(b?.datasetId && b.xColumnId && b.yColumnId);
    }
    return bindings.some((b) => b.datasetId && b.xColumnId && b.yColumnId);
  });

  /** True once a load succeeded but the query returned nothing to plot (vs. still loading). */
  private readonly empty = computed(() => {
    const data = this.source.result();
    if (!data) return false;
    const type = this.config().type;
    // Bar and box both report emptiness by their category axis; point charts by their series.
    if (type === 'barChart' || type === 'boxPlot') {
      return ((data as BarChartQueryResult | BoxPlotQueryResult).categories?.length ?? 0) === 0;
    }
    return (data as ChartQueryResult).series.every((s) => s.points.length === 0);
  });

  /** Tracks the dataset version the cache was built at, to drop it when columns change. */
  private cacheVersion = -1;

  /** The live echarts instance, captured on init, for image export. */
  private chartInstance: { getDataURL(opts?: object): string } | null = null;

  constructor() {
    // Resolve series colours whenever the plotted series change. Kept in an effect
    // (not the chartOption computed) because the palette carries state across
    // renders — mutating it is a side effect, which belongs here. Runs before the
    // view reads chartOption, so the option always builds with fresh colours.
    effect(() => {
      const labels = (this.source.result()?.series ?? []).map((s) => s.label);
      untracked(() => this.seriesColors.set(this.palette.resolve(labels)));
    });

    // Reloads whenever anything the server needs changes — the bindings' datasets
    // and columns, the aggregate, tolerance bands, or tooltip columns (all folded
    // into `queryKey`) — or the resolved per-binding filters, or the dataset
    // version. Appearance-only edits don't touch `queryKey`, so they don't reload.
    effect(() => {
      this.queryKey();
      const datasetId = this.datasetId();
      this.bindingFilters();
      const version = this.datasetVersion();

      // A column-configuration change can alter query results, so the cache built
      // at an older version is no longer trustworthy — drop it.
      if (version !== this.cacheVersion) {
        this.cacheVersion = version;
        untracked(() => this.queryCache.clear());
      }

      if (!datasetId) {
        untracked(() => {
          this.source.result.set(null);
          this.source.loading.set(false);
        });
        return;
      }

      untracked(() => {
        this.source.loading.set(true);
        this.source.error.set(false);
        this.source.reloadDebounced();
      });
    });
  }

  /** Re-runs the query after a load error. */
  public retry(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  public onChartInit(instance: { getDataURL(opts?: object): string }): void {
    this.chartInstance = instance;
  }

  /** Saves the current chart as a PNG. */
  public downloadPng(): void {
    if (this.chartInstance) ChartExport.png(this.chartInstance, this.exportName());
  }

  /** Saves the plotted data as a CSV — the rows behind the chart, one point per line. */
  public downloadCsv(): void {
    const data = this.source.result();
    if (data) ChartExport.csv(this.config(), data, this.source.columns(), this.exportName());
  }

  private exportName(): string {
    return this.config().title?.trim() || 'chart';
  }
}

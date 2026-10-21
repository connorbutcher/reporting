import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import type { ECElementEvent } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter';
import {
  ChartWidgetConfig,
  barValueColumnIds,
  readChartBindings,
} from '../../../../core/models/report';
import { widgetTypeDescriptor } from '../../../../core/models/widget-catalog';
import { WidgetComment } from '../../../../core/models/widget-comment.model';
import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  ChartQueryResult,
  HistogramQueryResult,
  XBarRChartQueryResult,
} from '../../../../core/models/widget-query';
import { ReportComments } from '../../../report-viewer/comments/report-comments';
import { DataWidgetBase } from '../data-widget-base';
import { WidgetCountBarComponent } from '../widget-count-bar/widget-count-bar.component';
import { WidgetDataSource } from '../widget-data-source';
import { WidgetStatusComponent } from '../widget-status/widget-status.component';
import {
  ChartSkeletonComponent,
  ChartSkeletonShape,
} from '../chart-skeleton/chart-skeleton.component';
import {
  DrillThroughDialogComponent,
  DrillThroughDialogData,
} from '../drill-through-dialog/drill-through-dialog.component';
import { ChartDrill } from './chart-drill';
import { ChartZoomMemory, ChartZoomRange } from './chart-zoom';
import { BoxOption } from './options/box-option';
import { ChartCountBar, ChartCountBarContent } from './chart-count-bar';
import { ChartExport } from './chart-export';
import { BarOption } from './options/bar-option';
import { ComboOption } from './options/combo-option';
import { ECOption } from './options/chart-option.types';
import { HistogramOption } from './options/histogram-option';
import { PointOption } from './options/point-option';
import {
  ChartCommentAnchor,
  CommentAnchorPoint,
  COMMENT_ANCHOR_SERIES_NAME,
} from './options/point-types';
import { SeriesPalette } from './options/series-colors';
import { XBarROption } from './options/xbar-r-option';
import { ChartQuery } from './query/chart-query';

type AnyChartResult =
  | ChartQueryResult
  | BarChartQueryResult
  | BoxPlotQueryResult
  | HistogramQueryResult
  | XBarRChartQueryResult;

/**
 * Renders a scatter, line, or bar chart. This host owns only the shared plumbing — inputs, the
 * data source, and reload triggers; each chart kind's query shape lives in {@link ChartQuery}
 * and its echarts options in {@link PointOption}/{@link BarOption}.
 */
@Component({
  selector: 'app-chart-widget',
  imports: [
    NgxEchartsDirective,
    ChartSkeletonComponent,
    WidgetCountBarComponent,
    WidgetStatusComponent,
  ],
  templateUrl: './chart-widget.component.html',
  styleUrl: './chart-widget.component.scss',
})
export class ChartWidgetComponent extends DataWidgetBase {
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
  /** This widget's stable id — set by the outlet directive only when rendered in the viewer. Needed to key comment anchors. */
  public readonly widgetId = input<string | null>(null);

  /** Icon for the empty state, so each chart kind shows its own glyph. */
  public readonly placeholderIcon = computed(() => widgetTypeDescriptor(this.config().type).icon);

  /** Whether this chart can take comment anchors at all — a point chart, rendered where comments exist (the viewer) and identified. */
  public readonly canAnchorComments = computed(
    () => this.isPointChart() && !!this.reportComments && this.widgetId() !== null,
  );
  /** Whether clicking a point right now pins a new comment to it, rather than doing nothing. */
  public readonly anchorModeOn = computed(
    () => this.canAnchorComments() && this.reportComments?.anchorModeWidgetId() === this.widgetId(),
  );

  /** Null until there's a dataset and enough columns bound to actually plot. */
  public readonly chartOption = computed<ECOption | null>(() => {
    const option = this.buildOption();
    if (!option) return null;
    // Screen readers get echarts' generated description of the chart, named by its title (an
    // undrawn title component — the widget header already shows it).
    const described: ECOption = {
      ...option,
      title: { text: this.exportName(), show: false },
      aria: { enabled: true },
    };
    // The remembered zoom is read untracked: zooming mustn't rebuild the option on every drag, only
    // be carried over when something else (a reload, a filter) does.
    return ChartZoomMemory.apply(
      described,
      untracked(() => this.zoomRange),
    );
  });

  /** Whether the chart is showing its values as a table instead of the plot. */
  public readonly showData = signal(false);

  /** The "View data" table: the export's rows, capped so a large point chart stays responsive. */
  public readonly dataTable = computed(() => {
    if (!this.showData()) return null;
    const data = this.source.result();
    if (!data) return null;
    const [header = [], ...rows] = ChartExport.table(this.config(), data, this.source.columns());
    const limit = 500;
    return {
      header,
      rows: rows.slice(0, limit).map((row) => row.map((cell) => dataCellText(cell))),
      hidden: Math.max(0, rows.length - limit),
    };
  });

  /** Whether clicking a mark opens the rows behind it — every grouping chart, once data has loaded. */
  public readonly canDrill = computed(() => !this.isPointChart() && this.source.result() !== null);

  /** The footer strip's content — see {@link ChartCountBar}. Null until a result has loaded. */
  public readonly countBar = computed<ChartCountBarContent | null>(() => {
    const result = this.source.result();
    return result ? ChartCountBar.build(result, this.isPointChart()) : null;
  });

  /** What is narrowing the chart, for the count bar's hover text. Reads the chart's first dataset's columns. */
  public readonly filterLines = computed(() =>
    this.describeFilters(Object.values(this.bindingFilters() ?? {}), this.source.columns()),
  );

  /** The loading skeleton's silhouette: a trend for scatter and line, columns for everything else. */
  public readonly skeletonShape = computed<ChartSkeletonShape>(() =>
    this.isPointChart() ? 'line' : 'bars',
  );

  /** Prompt shown when the chart isn't configured enough to plot, worded per kind. */
  public readonly configHint = computed(() => {
    switch (this.config().type) {
      case 'barChart':
      case 'comboChart':
        return 'Pick a category column in the side panel.';
      case 'boxPlot':
        return 'Pick a category and a value column in the side panel.';
      case 'histogram':
        return 'Pick a numeric column in the side panel.';
      case 'xbarRChart':
        return 'Pick a subgroup and a value column in the side panel.';
      default:
        return 'Pick an X and a Y column in the side panel.';
    }
  });

  /**
   * The single display state the template renders: a dataset prompt, a config
   * prompt, a load error, a first-load spinner, an empty-result notice, or the
   * chart itself.
   */
  public readonly view = computed<
    'noDataset' | 'needsConfig' | 'error' | 'loading' | 'empty' | 'ready'
  >(() => {
    if (!this.datasetId()) return 'noDataset';
    if (this.error()) return 'error';
    if (!this.configured()) return 'needsConfig';
    // A first load (nothing shown yet) gets a spinner; a reload keeps the chart.
    if (this.loading() && this.source.result() === null) return 'loading';
    return this.empty() ? 'empty' : 'ready';
  });

  /** A reload while a chart is already on screen — dims it rather than blanking to a spinner. */
  public readonly reloading = computed(() => this.loading() && this.source.result() !== null);

  /** This widget's own anchored comments, as markers — independent of whichever thread the aside panel has focused. */
  public readonly commentAnchors = computed<ChartCommentAnchor[]>(() =>
    (this.anchorsResource.value() ?? [])
      .filter(
        (c): c is WidgetComment & { anchorX: number; anchorY: number } =>
          c.anchorX != null && c.anchorY != null,
      )
      .map((c) => ({ x: c.anchorX, y: c.anchorY, yAxisIndex: c.anchorYAxisIndex })),
  );

  /** The anchor currently drawing attention, when it's one of this widget's own — a chip in the comments panel or one of this chart's own markers was just clicked. */
  public readonly highlightedAnchor = computed<ChartCommentAnchor | null>(() => {
    const target = this.reportComments?.highlightedAnchor();
    return target && target.widgetId === this.widgetId()
      ? { x: target.x, y: target.y, yAxisIndex: target.yAxisIndex }
      : null;
  });

  private readonly datasetApi = inject(DatasetApiService);
  private readonly dialog = inject(Dialog);
  /** The X zoom window the reader last left this chart at, remembered for their session. */
  private zoomRange: ChartZoomRange | null = null;
  private readonly reportComments = inject(ReportComments, { optional: true });

  /**
   * This widget's own comments, fetched independently of the aside panel's focused thread so its
   * anchor markers show up without the reader ever opening the panel. `countFor` is read only to pick
   * up the `counts` signal as a reactive dependency — posting or deleting a comment elsewhere changes
   * it, which is what triggers the refetch here.
   */
  private readonly anchorsResource = httpResource<WidgetComment[]>(() => {
    const comments = this.reportComments;
    const widgetId = this.widgetId();
    if (!comments || !widgetId || !this.isPointChart()) return undefined;
    comments.countFor(widgetId);
    const reportId = comments.reportId();
    return reportId ? `/api/reports/${reportId}/widgets/${widgetId}/comments` : undefined;
  });

  /** Whether this is a point chart (scatter/line) — as opposed to an aggregating bar, box, or histogram. */
  private readonly isPointChart = computed(() => {
    const type = this.config().type;
    return (
      type !== 'barChart' &&
      type !== 'comboChart' &&
      type !== 'boxPlot' &&
      type !== 'histogram' &&
      type !== 'xbarRChart'
    );
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
   * binding's dataset, columns, and draw-order sort, whether a trend line is
   * fitted, the bar aggregate and sort, the tolerance bands, and the tooltip
   * columns. The reload effect watches this rather than the whole config, so
   * appearance-only edits (axis labels, colours, zoom, markers, bounds) don't
   * fire a needless reload that would briefly dim the chart.
   */
  private readonly queryKey = computed(() => {
    const config = this.config();
    const bindings = readChartBindings(config).map((b) => [
      b.datasetId,
      b.xColumnId,
      b.yColumnId,
      // A bar chart plots several measures; changing them (beyond the mirrored first) must reload.
      b.valueColumnIds ?? null,
      b.seriesColumnId,
      // A scatter bubble's size column — server-resolved, so changing it must reload too.
      b.sizeColumnId ?? null,
      // A point chart's own draw order; ignored server-side by every grouping chart, so harmless
      // to include unconditionally here too.
      b.sort ?? null,
    ]);
    // Whether a trend line is fitted per series — a point-chart-only option, but harmless to
    // include unconditionally (every grouping chart ignores it server-side too).
    const trend = config.showTrendLine ?? false;
    const aggregate =
      config.type === 'barChart' || config.type === 'comboChart' ? config.aggregate : null;
    // A bar/combo chart's category order, resolved against the primary binding's dataset.
    const barSort = config.type === 'barChart' || config.type === 'comboChart' ? config.sort : null;
    // Box options that change the server response: whisker mode/length (which values become
    // outliers), the sort order, and whether raw points are pulled. Mean/n/capability/highlighting
    // are render-only (the summary always carries mean & σ), so they don't force a reload.
    const box =
      config.type === 'boxPlot'
        ? { w: config.whisker, f: config.whiskerFactor, s: config.sort, p: config.showPoints }
        : null;
    // Every histogram binning option changes what the server returns (the bins and their heights),
    // so all of them force a reload — none is render-only.
    const hist =
      config.type === 'histogram'
        ? {
            m: config.binMode,
            c: config.binCount,
            w: config.binWidth,
            lo: config.rangeMin,
            hi: config.rangeMax,
            n: config.normalize,
            cu: config.cumulative,
          }
        : null;
    // Server-side grouping options: a date category's period (every grouping chart), a line chart's
    // aggregate, and the control chart's order, mode, baseline and run rules.
    const grouping = 'categoryGrouping' in config ? (config.categoryGrouping ?? null) : null;
    const line =
      config.type === 'lineChart'
        ? { a: config.aggregate ?? null, g: config.xGrouping ?? null }
        : null;
    const control =
      config.type === 'xbarRChart'
        ? {
            s: config.sort,
            m: config.mode ?? 'xBarR',
            b: config.baselineSubgroups ?? null,
            r: config.runRules ?? false,
          }
        : null;
    return JSON.stringify({
      bindings,
      trend,
      aggregate,
      barSort,
      box,
      hist,
      grouping,
      line,
      control,
      tol: config.toleranceBands,
      tip: config.tooltipColumns,
    });
  });

  /** Per-binding response cache so editing one binding doesn't refetch the others. */
  private readonly queryCache = new Map<string, ChartQueryResult>();

  private readonly source: WidgetDataSource<AnyChartResult> = new WidgetDataSource<AnyChartResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    fetch: () =>
      ChartQuery.build(
        this.datasetApi,
        this.config(),
        this.bindingFilters(),
        this.queryCache,
        this.source.columns(),
      ),
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
    if (config.type === 'barChart' || config.type === 'comboChart') {
      // Any bound binding with a category (and, unless counting, a measure) is enough to plot.
      return bindings.some(
        (b) =>
          b.datasetId &&
          b.xColumnId &&
          (config.aggregate === 'count' || barValueColumnIds(b).length > 0),
      );
    }
    if (config.type === 'boxPlot' || config.type === 'xbarRChart') {
      const b = bindings[0];
      return !!(b?.datasetId && b.xColumnId && b.yColumnId);
    }
    if (config.type === 'histogram') {
      // Any bound series is enough to plot — the others can still be mid-setup.
      return bindings.some((b) => b.datasetId && b.xColumnId);
    }
    return bindings.some((b) => b.datasetId && b.xColumnId && b.yColumnId);
  });

  /** True once a load succeeded but the query returned nothing to plot (vs. still loading). */
  private readonly empty = computed(() => {
    const data = this.source.result();
    if (!data) return false;
    const type = this.config().type;
    // Bar and box both report emptiness by their category axis; a histogram by its bins; point
    // charts by their series.
    if (
      type === 'barChart' ||
      type === 'comboChart' ||
      type === 'boxPlot' ||
      type === 'xbarRChart'
    ) {
      return (
        ((data as BarChartQueryResult | BoxPlotQueryResult | XBarRChartQueryResult).categories
          ?.length ?? 0) === 0
      );
    }
    if (type === 'histogram') {
      return ((data as HistogramQueryResult).bins?.length ?? 0) === 0;
    }
    return (data as ChartQueryResult).series.every((s) => s.points.length === 0);
  });

  /** Tracks the dataset version the cache was built at, to drop it when columns change. */
  private cacheVersion = -1;

  /** The live echarts instance, captured on init, for image export. */
  private chartInstance: { getDataURL(opts?: object): string } | null = null;

  constructor() {
    super();
    // Resolve series colours whenever the plotted series change. Kept in an effect
    // (not the chartOption computed) because the palette carries state across
    // renders — mutating it is a side effect, which belongs here. Runs before the
    // view reads chartOption, so the option always builds with fresh colours.
    effect(() => {
      // An Xbar-R result has no `series` — it's a single fixed-colour process line, not a
      // palette-coloured overlay — so it simply resolves no labels.
      const result = this.source.result();
      const labels = result && 'series' in result ? result.series.map((s) => s.label) : [];
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
    this.zoomRange = ChartZoomMemory.read(this.zoomKey());
  }

  /** Remembers where the reader zoomed to, so the next rebuild keeps it. */
  public onDataZoom(event: unknown): void {
    const range = ChartZoomMemory.fromEvent(event);
    if (!range) return;
    this.zoomRange = range;
    ChartZoomMemory.write(this.zoomKey(), range);
  }

  /** Switches "click a point to anchor a comment" on or off for this chart. */
  public toggleData(): void {
    this.showData.update((on) => !on);
    // The canvas is re-created when the chart comes back, so its old instance is gone.
    if (this.showData()) this.chartInstance = null;
  }

  public toggleAnchorMode(): void {
    const widgetId = this.widgetId();
    if (widgetId) this.reportComments?.toggleAnchorMode(widgetId);
  }

  /**
   * Either opens an existing comment (the click landed on one of its own anchor markers), in anchor
   * mode pins a new one to the data point that was clicked, or otherwise — on a grouping chart —
   * opens the rows behind the clicked mark. Anchoring only makes sense for a
   * numeric point — a category axis's click value is a label, not a coordinate, so that case is
   * silently ignored rather than anchored to the wrong thing.
   */
  public onChartClick(event: ECElementEvent): void {
    const comments = this.reportComments;
    const widgetId = this.widgetId();
    if (!comments || !widgetId) {
      this.drill(event);
      return;
    }

    if (event.seriesName === COMMENT_ANCHOR_SERIES_NAME) {
      const anchor = (event.data as CommentAnchorPoint | undefined)?.anchor;
      if (!anchor) return;
      comments.open(widgetId);
      comments.highlight({ widgetId, ...anchor });
      return;
    }

    if (!this.anchorModeOn()) {
      this.drill(event);
      return;
    }
    const value = event.value;
    if (!Array.isArray(value) || typeof value[0] !== 'number' || typeof value[1] !== 'number')
      return;
    const [x, y] = value;
    const series = this.chartOption()?.series;
    const clicked = Array.isArray(series) ? series[event.seriesIndex ?? -1] : undefined;
    const yAxisIndex =
      clicked && 'yAxisIndex' in clicked ? (clicked.yAxisIndex as number | undefined) : undefined;
    comments.pickAnchor(widgetId, { x, y, yAxisIndex, label: formatAnchorLabel(x, y) });
  }

  /**
   * Grabs the PNG straight from the live echarts canvas rather than the base
   * class's default DOM rasterization — cheaper, and sharper than re-drawing
   * the canvas through a screenshot.
   */
  public override async downloadScreenshot(): Promise<void> {
    if (!this.chartInstance) return;
    const url = this.chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
    this.downloadUrl(url, `${this.exportName()}.png`);
  }

  /** The rows behind the chart, one point per line, shaped per chart kind. */
  protected exportCsv(): string | null {
    const data = this.source.result();
    if (!data) return null;
    return ChartExport.csv(this.config(), data, this.source.columns());
  }

  protected exportName(): string {
    return this.config().title?.trim() || 'chart';
  }

  /** The option for the chart's kind, before any remembered zoom is applied. */
  private buildOption(): ECOption | null {
    const config = this.config();
    const columns = this.source.columns();
    const data = this.source.result();
    const colors = this.seriesColors();
    switch (config.type) {
      case 'barChart':
        return BarOption.build(config, data as BarChartQueryResult | null, columns, colors);
      case 'comboChart':
        return ComboOption.build(config, data as BarChartQueryResult | null, columns, colors);
      case 'boxPlot':
        return BoxOption.build(config, data as BoxPlotQueryResult | null, columns, colors);
      case 'histogram':
        return HistogramOption.build(config, data as HistogramQueryResult | null, columns, colors);
      case 'xbarRChart':
        return XBarROption.build(config, data as XBarRChartQueryResult | null, columns);
      default:
        return PointOption.build(
          config,
          data as ChartQueryResult | null,
          columns,
          colors,
          this.commentAnchors(),
          this.highlightedAnchor(),
        );
    }
  }

  /** Opens the rows behind a clicked bar, box, bin or control-chart point, as a table. */
  private drill(event: ECElementEvent): void {
    if (!this.canDrill()) return;
    const data = this.source.result() as Parameters<typeof ChartDrill.target>[1];
    const target = ChartDrill.target(
      this.config(),
      data,
      { seriesName: event.seriesName, seriesType: event.seriesType, dataIndex: event.dataIndex },
      this.bindingFilters(),
    );
    if (!target) return;
    this.dialog.open<void, DrillThroughDialogData>(DrillThroughDialogComponent, {
      data: {
        datasetId: target.datasetId,
        title: [this.exportName(), ...target.path].join(' › '),
        filter: target.filter,
      },
      ariaLabelledBy: 'drill-through-title',
    });
  }

  /** Where this chart's zoom is remembered: its widget id in the viewer, else its title. */
  private zoomKey(): string | null {
    return this.widgetId() ?? (this.config().title?.trim() || null);
  }
}

/** A coordinate shown in the comment composer's anchor chip — exact enough to recognise the point, not a formatted axis tick. */
function formatAnchorLabel(x: number, y: number): string {
  const format = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return `${format(x)}, ${format(y)}`;
}

/** One "View data" cell as text: numbers to a readable precision, flags as Yes/No. */
function dataCellText(cell: string | number | boolean): string {
  if (typeof cell === 'number') return cell.toLocaleString('en-US', { maximumFractionDigits: 6 });
  if (typeof cell === 'boolean') return cell ? 'Yes' : 'No';
  return cell;
}

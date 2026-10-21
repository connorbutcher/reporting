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
import { ChartSkeletonComponent } from '../chart-skeleton/chart-skeleton.component';
import { ChartSkeletonShape } from '../chart-skeleton/chart-skeleton-shape';
import { DrillThroughDialogComponent } from '../drill-through-dialog/drill-through-dialog.component';
import { DrillThroughDialogData } from '../drill-through-dialog/drill-through-dialog-data';
import { ChartDrill } from './chart-drill';
import { ChartZoomMemory } from './chart-zoom';
import { ChartZoomRange } from './models/chart-zoom-range';
import { BoxOption } from './options/box/box-option';
import { ChartCountBar } from './chart-count-bar';
import { ChartCountBarContent } from './models/chart-count-bar-content';
import { ChartExport } from './chart-export';
import { BarOption } from './options/bar/bar-option';
import { ComboOption } from './options/combo/combo-option';
import { ECOption } from './options/types/ec-option';
import { HistogramOption } from './options/histogram/histogram-option';
import { PointOption } from './options/point/point-option';
import { PointChartConstants } from './options/point/point-chart-constants';
import { ChartCommentAnchor } from './options/point/types/chart-comment-anchor';
import { CommentAnchorPoint } from './options/point/types/comment-anchor-point';
import { SeriesPalette } from './options/colors/series-palette';
import { XBarROption } from './options/xbar-r/xbar-r-option';
import { ChartQuery } from './query/chart-query';
import { ChartQueryKey } from './query/chart-query-key';
import { AnyChartResult } from './models/any-chart-result';

/** Hosts a chart: inputs, data loading and reloads. Queries live in {@link ChartQuery}, options in the option builders. */
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
  /** Each binding's query-safe filter (report filter layered under its own), by binding id. */
  public readonly bindingFilters = input<Record<string, FilterGroup | null> | null>(null);
  /** Set by the outlet only in the viewer; keys comment anchors. */
  public readonly widgetId = input<string | null>(null);
  public readonly placeholderIcon = computed(() => widgetTypeDescriptor(this.config().type).icon);

  /** A point chart, in the viewer, with an id. */
  public readonly canAnchorComments = computed(
    () => this.isPointChart() && !!this.reportComments && this.widgetId() !== null,
  );
  public readonly anchorModeOn = computed(
    () => this.canAnchorComments() && this.reportComments?.anchorModeWidgetId() === this.widgetId(),
  );

  public readonly chartOption = computed<ECOption | null>(() => {
    const option = this.buildOption();
    if (!option) return null;
    // Screen readers get echarts' generated description, named by an undrawn title.
    const described: ECOption = {
      ...option,
      title: { text: this.exportName(), show: false },
      aria: { enabled: true },
    };
    // Read untracked so zooming doesn't rebuild the option on every drag.
    return ChartZoomMemory.apply(
      described,
      untracked(() => this.zoomRange),
    );
  });

  public readonly showData = signal(false);

  /** Capped so a large point chart stays responsive. */
  public readonly dataTable = computed(() => {
    if (!this.showData()) return null;
    const data = this.source.result();
    if (!data) return null;
    const [header = [], ...rows] = ChartExport.table(this.config(), data, this.source.columns());
    const limit = 500;
    return {
      header,
      rows: rows
        .slice(0, limit)
        .map((row) => row.map((cell) => ChartWidgetComponent.dataCellText(cell))),
      hidden: Math.max(0, rows.length - limit),
    };
  });

  public readonly canDrill = computed(() => !this.isPointChart() && this.source.result() !== null);

  public readonly countBar = computed<ChartCountBarContent | null>(() => {
    const result = this.source.result();
    return result ? ChartCountBar.build(result, this.isPointChart()) : null;
  });

  public readonly filterLines = computed(() =>
    this.describeFilters(Object.values(this.bindingFilters() ?? {}), this.source.columns()),
  );

  public readonly skeletonShape = computed<ChartSkeletonShape>(() =>
    this.isPointChart() ? 'line' : 'bars',
  );

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

  public readonly view = computed<
    'noDataset' | 'needsConfig' | 'error' | 'loading' | 'empty' | 'ready'
  >(() => {
    if (!this.datasetId()) return 'noDataset';
    if (this.error()) return 'error';
    if (!this.configured()) return 'needsConfig';
    // A first load gets a spinner; a reload keeps the chart.
    if (this.loading() && this.source.result() === null) return 'loading';
    return this.empty() ? 'empty' : 'ready';
  });

  /** A reload with a chart on screen dims it rather than blanking it. */
  public readonly reloading = computed(() => this.loading() && this.source.result() !== null);

  public readonly commentAnchors = computed<ChartCommentAnchor[]>(() =>
    (this.anchorsResource.value() ?? [])
      .filter(
        (c): c is WidgetComment & { anchorX: number; anchorY: number } =>
          c.anchorX != null && c.anchorY != null,
      )
      .map((c) => ({ x: c.anchorX, y: c.anchorY, yAxisIndex: c.anchorYAxisIndex })),
  );

  /** The highlighted anchor, when it belongs to this widget. */
  public readonly highlightedAnchor = computed<ChartCommentAnchor | null>(() => {
    const target = this.reportComments?.highlightedAnchor();
    return target && target.widgetId === this.widgetId()
      ? { x: target.x, y: target.y, yAxisIndex: target.yAxisIndex }
      : null;
  });

  private readonly datasetApi = inject(DatasetApiService);
  private readonly dialog = inject(Dialog);
  private zoomRange: ChartZoomRange | null = null;
  private readonly reportComments = inject(ReportComments, { optional: true });

  /**
   * This widget's comments, fetched without the aside panel so markers show up. Reading `countFor`
   * makes posting or deleting a comment elsewhere trigger a refetch.
   */
  private readonly anchorsResource = httpResource<WidgetComment[]>(() => {
    const comments = this.reportComments;
    const widgetId = this.widgetId();
    if (!comments || !widgetId || !this.isPointChart()) return undefined;
    comments.countFor(widgetId);
    const reportId = comments.reportId();
    return reportId ? `/api/reports/${reportId}/widgets/${widgetId}/comments` : undefined;
  });

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

  /** The first bound binding's dataset names the axes, so an unconfigured earlier binding doesn't block rendering. */
  private readonly datasetId = computed(
    () => readChartBindings(this.config()).find((b) => b.datasetId)?.datasetId ?? null,
  );

  private readonly queryKey = computed(() => ChartQueryKey.of(this.config()));

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

  /** Keeps series colours stable across rebuilds; updated from an effect because it holds state. */
  private readonly palette = new SeriesPalette();
  private readonly seriesColors = signal<Map<string, string>>(new Map());

  /** Read from the config, so a loading schema doesn't look unconfigured. */
  private readonly configured = computed(() => {
    const config = this.config();
    const bindings = readChartBindings(config);
    if (config.type === 'barChart' || config.type === 'comboChart') {
      // One bound binding with a category (and a measure, unless counting) is enough.
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
      return bindings.some((b) => b.datasetId && b.xColumnId);
    }
    return bindings.some((b) => b.datasetId && b.xColumnId && b.yColumnId);
  });

  /** A load succeeded but returned nothing to plot. */
  private readonly empty = computed(() => {
    const data = this.source.result();
    if (!data) return false;
    const type = this.config().type;
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

  private cacheVersion = -1;
  private chartInstance: { getDataURL(opts?: object): string } | null = null;

  constructor() {
    super();
    // The palette holds state across renders, so it's resolved here rather than in chartOption.
    effect(() => {
      // An Xbar-R result has no series.
      const result = this.source.result();
      const labels = result && 'series' in result ? result.series.map((s) => s.label) : [];
      untracked(() => this.seriesColors.set(this.palette.resolve(labels)));
    });

    effect(() => {
      this.queryKey();
      const datasetId = this.datasetId();
      this.bindingFilters();
      const version = this.datasetVersion();

      // A column configuration change invalidates cached results.
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

  /** Exact enough to recognise the point; not a formatted tick. */
  private static formatAnchorLabel(x: number, y: number): string {
    return [x, y].map((n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))).join(', ');
  }

  private static dataCellText(cell: string | number | boolean): string {
    if (typeof cell === 'number') return cell.toLocaleString('en-US', { maximumFractionDigits: 6 });
    if (typeof cell === 'boolean') return cell ? 'Yes' : 'No';
    return cell;
  }

  public retry(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  public onChartInit(instance: { getDataURL(opts?: object): string }): void {
    this.chartInstance = instance;
    this.zoomRange = ChartZoomMemory.read(this.zoomKey());
  }

  public onDataZoom(event: unknown): void {
    const range = ChartZoomMemory.fromEvent(event);
    if (!range) return;
    this.zoomRange = range;
    ChartZoomMemory.write(this.zoomKey(), range);
  }

  public toggleData(): void {
    this.showData.update((on) => !on);
    // The canvas is recreated when the chart comes back.
    if (this.showData()) this.chartInstance = null;
  }

  public toggleAnchorMode(): void {
    const widgetId = this.widgetId();
    if (widgetId) this.reportComments?.toggleAnchorMode(widgetId);
  }

  /**
   * Opens a clicked comment marker, pins a new comment in anchor mode, or drills into a grouping
   * chart's mark. A category click has no coordinate, so it can't anchor.
   */
  public onChartClick(event: ECElementEvent): void {
    const comments = this.reportComments;
    const widgetId = this.widgetId();
    if (!comments || !widgetId) {
      this.drill(event);
      return;
    }

    if (event.seriesName === PointChartConstants.COMMENT_ANCHOR_SERIES_NAME) {
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
    comments.pickAnchor(widgetId, {
      x,
      y,
      yAxisIndex,
      label: ChartWidgetComponent.formatAnchorLabel(x, y),
    });
  }

  /** Exports straight from the echarts canvas, which is cheaper and sharper than rasterizing the DOM. */
  public override async downloadScreenshot(): Promise<void> {
    if (!this.chartInstance) return;
    const url = this.chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
    this.downloadUrl(url, `${this.exportName()}.png`);
  }

  public exportCsv(): string | null {
    const data = this.source.result();
    if (!data) return null;
    return ChartExport.csv(this.config(), data, this.source.columns());
  }

  public exportName(): string {
    return this.config().title?.trim() || 'chart';
  }

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

  /** The widget id in the viewer, else the title. */
  private zoomKey(): string | null {
    return this.widgetId() ?? (this.config().title?.trim() || null);
  }
}

import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn } from '../../../../core/models/dataset.model';
import { FilterGroup } from '../../../../core/models/filter.model';
import {
  Aggregate,
  BarChartWidgetConfig,
  ChartWidgetConfig,
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
} from '../../../../core/models/report.model';
import { widgetTypeDescriptor } from '../../../../core/models/widget-catalog';
import {
  BarChartQueryResult,
  ChartQueryResult,
  ChartSeriesResult,
  ResolvedToleranceBand,
} from '../../../../core/models/widget-query.model';
import { resolveWidgetFilter } from '../effective-filter';
import { WidgetDataSource } from '../widget-data-source';

/** Cycles if there are more series than colours. */
const SERIES_COLORS = [
  '#2f6fed',
  '#f97316',
  '#16a34a',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#ca8a04',
  '#dc2626',
];

interface ScatterPoint {
  value: [number, number];
  tooltipLines: string[];
}

interface ScatterTooltipParams {
  value: [number, number];
  seriesName: string;
  data: ScatterPoint;
}

/** The two chart kinds that plot raw rows as points, as opposed to aggregated bars. */
type PointChartConfig = ScatterChartWidgetConfig | LineChartWidgetConfig;

@Component({
  selector: 'app-chart-widget',
  imports: [NgxEchartsDirective],
  templateUrl: './chart-widget.component.html',
  styleUrl: './chart-widget.component.scss',
})
export class ChartWidgetComponent {
  readonly config = input.required<ChartWidgetConfig>();
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  readonly datasetVersion = input(0);
  /** The report-level filter for this chart's dataset, if any. */
  readonly reportFilter = input<FilterGroup | null>(null);
  /**
   * The widget's own filter, supplied by the host rather than read from
   * {@link config} so the builder can leave out conditions the user hasn't
   * finished typing. Defaults to whatever the config carries.
   */
  readonly widgetFilter = input<FilterGroup | null | undefined>(undefined);

  private readonly datasetApi = inject(DatasetApiService);

  protected readonly datasetId = computed(() => this.config().datasetId);

  /** Icon for the empty state, so each chart kind shows its own glyph. */
  protected readonly placeholderIcon = computed(() => widgetTypeDescriptor(this.config().type).icon);

  /** Report-level and widget-level filters, as the single tree sent to the API. */
  private readonly effectiveFilter = computed(() =>
    resolveWidgetFilter(this.reportFilter(), this.widgetFilter(), this.config().filter),
  );

  private readonly source = new WidgetDataSource<ChartQueryResult | BarChartQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    fetch: () => {
      const config = this.config();
      const datasetId = this.datasetId();
      if (!datasetId) return null;

      // A bar chart groups and aggregates server-side, so it asks a different
      // endpoint and needs a category (and, unless counting, a measure).
      if (config.type === 'barChart') {
        const category = config.xColumnId;
        if (!category) return null;
        const needsValue = config.aggregate !== 'count';
        if (needsValue && !config.yColumnId) return null;

        return this.datasetApi.queryBarChart(datasetId, {
          filter: this.effectiveFilter(),
          categoryColumnId: category,
          valueColumnId: needsValue ? config.yColumnId : null,
          aggregate: config.aggregate,
          seriesColumnId: config.seriesColumnId,
          toleranceBands: config.toleranceBands,
        });
      }

      const x = config.xColumnId;
      const y = config.yColumnId;
      if (!x || !y) return null;

      return this.datasetApi.queryChart(datasetId, {
        filter: this.effectiveFilter(),
        xColumnId: x,
        yColumnId: y,
        seriesColumnId: config.seriesColumnId,
        toleranceBands: config.toleranceBands,
        tooltipColumns: config.tooltipColumns,
      });
    },
  });

  protected readonly loading = this.source.loading;
  protected readonly error = this.source.error;
  private readonly data = this.source.result;

  private readonly xColumn = computed(() => this.columnById(this.config().xColumnId));
  private readonly yColumn = computed(() => this.columnById(this.config().yColumnId));
  private readonly seriesColumn = computed(() => this.columnById(this.config().seriesColumnId));

  /** Null until there's a dataset and enough columns bound to actually plot. */
  protected readonly chartOption = computed<EChartsCoreOption | null>(() => {
    const config = this.config();
    return config.type === 'barChart' ? this.barOption(config) : this.pointOption(config);
  });

  constructor() {
    // Points reload whenever the dataset, its axes, the aggregate, either filter,
    // the tolerance bands, or the tooltip columns change — the server needs all
    // of these to build a response.
    effect(() => {
      const config = this.config();
      const datasetId = this.datasetId();
      config.xColumnId;
      config.yColumnId;
      config.seriesColumnId;
      config.toleranceBands;
      config.tooltipColumns;
      if (config.type === 'barChart') config.aggregate;
      this.effectiveFilter();
      this.datasetVersion();

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

  /** The scatter/line option: value axes with one mark per row, grouped into series. */
  private pointOption(config: PointChartConfig): EChartsCoreOption | null {
    const x = this.xColumn();
    const y = this.yColumn();
    if (!x || !y) return null;

    const seriesColumn = this.seriesColumn();
    const data = this.data() as ChartQueryResult | null;
    const series = data?.series ?? [];

    const xLabel = config.xAxisLabel.trim() || x.name;
    const yLabel = config.yAxisLabel.trim() || y.name;
    const names = series.map((s) => s.label);
    const markLineData = this.markLineData((band) => (band.axis === 'x' ? 'xAxis' : 'yAxis'));

    return {
      grid: {
        left: 56,
        right: 20,
        top: seriesColumn && config.showLegend ? 40 : 20,
        bottom: 48,
        containLabel: true,
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: ScatterTooltipParams) =>
          this.formatTooltip(params, seriesColumn, xLabel, yLabel),
      },
      ...(seriesColumn && config.showLegend ? { legend: { top: 0, data: names } } : {}),
      xAxis: { type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 28 },
      yAxis: { type: 'value', name: yLabel, nameLocation: 'middle', nameGap: 40 },
      series: series.map((s, i) => {
        const color = SERIES_COLORS[i % SERIES_COLORS.length];
        return {
          name: s.label || config.title || 'Series',
          ...seriesKindOptions(config, color),
          itemStyle: { color },
          data: pointsFor(s),
          // Attached to the first series only — markLine coordinates are chart-wide,
          // so one copy is enough regardless of how many series are plotted.
          ...(i === 0 && markLineData.length > 0
            ? { markLine: { silent: true, symbol: 'none', data: markLineData } }
            : {}),
        };
      }),
    };
  }

  /** The bar option: a category axis with one aggregated value per category, per series. */
  private barOption(config: BarChartWidgetConfig): EChartsCoreOption | null {
    const categoryColumn = this.xColumn();
    if (!categoryColumn) return null;

    const data = this.data() as BarChartQueryResult | null;
    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    const valueColumn = this.yColumn();
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    const valueLabel = config.yAxisLabel.trim() || valueColumn?.name || aggregateLabel(config.aggregate);

    // A legend only earns its space once bars split into more than one series.
    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;

    // The value axis is whichever one isn't holding the categories, so reference
    // lines land on the measure regardless of orientation.
    const markLineData = this.markLineData(() => (horizontal ? 'xAxis' : 'yAxis'));

    const categoryAxis = {
      type: 'category' as const,
      data: categories,
      name: categoryLabel,
      nameLocation: 'middle' as const,
      nameGap: horizontal ? 64 : 28,
      // Long category lists overlap horizontally, so tilt them once there are a few.
      ...(horizontal ? {} : { axisLabel: { rotate: categories.length > 6 ? 30 : 0 } }),
    };
    const valueAxis = {
      type: 'value' as const,
      name: valueLabel,
      nameLocation: 'middle' as const,
      nameGap: horizontal ? 28 : 48,
    };

    return {
      grid: { left: 56, right: 20, top: showLegend ? 40 : 20, bottom: 56, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      ...(showLegend ? { legend: { top: 0, data: series.map((s) => s.label) } } : {}),
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: series.map((s, i) => {
        const color = SERIES_COLORS[i % SERIES_COLORS.length];
        return {
          name: s.label || config.title || 'Series',
          type: 'bar' as const,
          // A shared stack name piles a category's series into one bar.
          ...(config.stacked ? { stack: 'total' } : {}),
          itemStyle: { color },
          data: s.values,
          ...(i === 0 && markLineData.length > 0
            ? { markLine: { silent: true, symbol: 'none', data: markLineData } }
            : {}),
        };
      }),
    };
  }

  /**
   * Dashed line entries for every resolved band's bounds, coloured by what crossing
   * them means. The axis each line binds to is chosen by the caller, since a bar's
   * value axis flips with orientation while a scatter band keeps its own axis.
   */
  private markLineData(axisKeyFor: (band: ResolvedToleranceBand) => 'xAxis' | 'yAxis'): object[] {
    const entries: object[] = [];

    for (const band of this.data()?.toleranceBands ?? []) {
      if (band.min === null || band.max === null) continue;

      const axisKey = axisKeyFor(band);
      const hasConcession = band.concessionLower !== null || band.concessionUpper !== null;
      const minMaxColor = hasConcession ? '#d97706' : '#dc2626';

      const line = (value: number, label: string, color: string) => ({
        [axisKey]: value,
        label: { formatter: label, position: 'insideEndTop', color, fontSize: 10 },
        lineStyle: { color, type: 'dashed', width: 1.5 },
      });

      entries.push(line(band.min, 'Min', minMaxColor), line(band.max, 'Max', minMaxColor));
      if (band.concessionLower !== null)
        entries.push(line(band.concessionLower, 'Concession lower', '#dc2626'));
      if (band.concessionUpper !== null)
        entries.push(line(band.concessionUpper, 'Concession upper', '#dc2626'));
    }

    return entries;
  }

  private formatTooltip(
    params: ScatterTooltipParams,
    seriesColumn: DatasetColumn | null,
    xLabel: string,
    yLabel: string,
  ): string {
    const lines = [
      ...(seriesColumn ? [params.seriesName] : []),
      `${xLabel}: ${params.value[0]}`,
      `${yLabel}: ${params.value[1]}`,
      ...params.data.tooltipLines,
    ];

    return lines.join('<br/>');
  }

  private columnById(id: string | null): DatasetColumn | null {
    return id ? (this.source.columns().find((c) => c.id === id) ?? null) : null;
  }
}

function pointsFor(series: ChartSeriesResult): ScatterPoint[] {
  return series.points.map((p) => ({ value: [p.x, p.y], tooltipLines: p.tooltipLines }));
}

function aggregateLabel(aggregate: Aggregate): string {
  switch (aggregate) {
    case 'sum':
      return 'Sum';
    case 'average':
      return 'Average';
    case 'count':
      return 'Count';
    case 'min':
      return 'Min';
    case 'max':
      return 'Max';
  }
}

/**
 * The echarts series options specific to one point-chart kind — the type and its
 * per-kind styling. Everything else (name, colour, data, mark lines) is shared by
 * the caller. Bars are handled separately, in {@link ChartWidgetComponent}.
 */
function seriesKindOptions(config: PointChartConfig, color: string): object {
  switch (config.type) {
    case 'lineChart':
      return {
        type: 'line' as const,
        smooth: config.smooth,
        showSymbol: config.showPoints,
        symbol: config.showPoints ? 'circle' : 'none',
        symbolSize: config.pointSize,
        ...(config.areaFill ? { areaStyle: { opacity: 0.15, color } } : {}),
      };
    case 'scatterChart':
      return { type: 'scatter' as const, symbolSize: config.pointSize };
  }
}

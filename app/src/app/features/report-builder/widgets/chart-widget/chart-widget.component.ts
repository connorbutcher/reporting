import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn } from '../../../../core/models/dataset.model';
import { FilterGroup } from '../../../../core/models/filter.model';
import { ChartWidgetConfig } from '../../../../core/models/report.model';
import { ChartQueryResult, ChartSeriesResult } from '../../../../core/models/widget-query.model';
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

  /** Report-level and widget-level filters, as the single tree sent to the API. */
  private readonly effectiveFilter = computed(() =>
    resolveWidgetFilter(this.reportFilter(), this.widgetFilter(), this.config().filter),
  );

  private readonly source = new WidgetDataSource<ChartQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    fetch: () => {
      const datasetId = this.datasetId();
      const x = this.config().xColumnId;
      const y = this.config().yColumnId;
      if (!datasetId || !x || !y) return null;

      return this.datasetApi.queryChart(datasetId, {
        filter: this.effectiveFilter(),
        xColumnId: x,
        yColumnId: y,
        seriesColumnId: this.config().seriesColumnId,
        toleranceBands: this.config().toleranceBands,
        tooltipColumns: this.config().tooltipColumns,
      });
    },
  });

  protected readonly loading = this.source.loading;
  protected readonly error = this.source.error;
  private readonly data = this.source.result;

  private readonly xColumn = computed(() => this.columnById(this.config().xColumnId));
  private readonly yColumn = computed(() => this.columnById(this.config().yColumnId));
  private readonly seriesColumn = computed(() => this.columnById(this.config().seriesColumnId));

  /** Null until there's a dataset and both axes to actually plot. */
  protected readonly chartOption = computed<EChartsCoreOption | null>(() => {
    const x = this.xColumn();
    const y = this.yColumn();
    if (!x || !y) return null;

    const seriesColumn = this.seriesColumn();
    const config = this.config();
    const series = this.data()?.series ?? [];

    const xLabel = config.xAxisLabel.trim() || x.name;
    const yLabel = config.yAxisLabel.trim() || y.name;
    const names = series.map((s) => s.label);
    const markLineData = this.markLineData();

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
        const isLine = config.chartType === 'line';
        return {
          name: s.label || config.title || 'Series',
          type: isLine ? ('line' as const) : ('scatter' as const),
          ...(isLine
            ? {
                smooth: config.smooth,
                showSymbol: config.showPoints,
                symbol: config.showPoints ? 'circle' : 'none',
                symbolSize: config.pointSize,
                ...(config.areaFill ? { areaStyle: { opacity: 0.15, color } } : {}),
              }
            : { symbolSize: config.pointSize }),
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
  });

  constructor() {
    // Points reload whenever the dataset, its axes, either filter, the
    // tolerance bands, or the tooltip columns change — the server needs all
    // of these to build a response.
    effect(() => {
      const datasetId = this.datasetId();
      this.config().xColumnId;
      this.config().yColumnId;
      this.config().seriesColumnId;
      this.config().toleranceBands;
      this.config().tooltipColumns;
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

  /** Dashed line entries for every resolved band's bounds, coloured by what crossing them means. */
  private markLineData(): object[] {
    const entries: object[] = [];

    for (const band of this.data()?.toleranceBands ?? []) {
      if (band.min === null || band.max === null) continue;

      const axisKey = band.axis === 'x' ? 'xAxis' : 'yAxis';
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

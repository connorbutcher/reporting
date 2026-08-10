import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn } from '../../../../core/models/dataset.model';
import { FilterGroup, combineFilters } from '../../../../core/models/filter.model';
import { ChartWidgetConfig } from '../../../../core/models/report.model';
import { ChartQueryResult, ChartSeriesResult } from '../../../../core/models/widget-query.model';

/** Long enough that typing a filter value settles into one request. */
const QUERY_DEBOUNCE_MS = 300;
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

  private readonly allColumns = signal<DatasetColumn[]>([]);
  private readonly data = signal<ChartQueryResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly datasetId = computed(() => this.config().datasetId);

  /** Report-level and widget-level filters, as the single tree sent to the API. */
  private readonly effectiveFilter = computed(() => {
    const own = this.widgetFilter() === undefined ? this.config().filter : this.widgetFilter()!;
    return combineFilters(this.reportFilter(), own);
  });

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
        formatter: (params: ScatterTooltipParams) => this.formatTooltip(params, seriesColumn, xLabel, yLabel),
      },
      ...(seriesColumn && config.showLegend ? { legend: { top: 0, data: names } } : {}),
      xAxis: { type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 28 },
      yAxis: { type: 'value', name: yLabel, nameLocation: 'middle', nameGap: 40 },
      series: series.map((s, i) => ({
        name: s.label || config.title || 'Series',
        type: 'scatter' as const,
        symbolSize: config.pointSize,
        itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
        data: pointsFor(s),
        // Attached to the first series only — markLine coordinates are chart-wide,
        // so one copy is enough regardless of how many series are plotted.
        ...(i === 0 && markLineData.length > 0
          ? { markLine: { silent: true, symbol: 'none', data: markLineData } }
          : {}),
      })),
    };
  });

  /** Coalesces reloads so typing a filter value doesn't fire a request per keystroke. */
  private readonly queryQueue = new Subject<void>();

  constructor() {
    // The schema names the axes and changes only with the dataset, so it loads
    // immediately rather than through the debounced row pipeline.
    effect((onCleanup) => {
      const datasetId = this.datasetId();
      this.datasetVersion();

      if (!datasetId) {
        this.allColumns.set([]);
        return;
      }

      const subscription = this.datasetApi.getSchema(datasetId).subscribe({
        next: (schema) => this.allColumns.set(schema.columns),
        error: () => this.error.set(true),
      });

      onCleanup(() => subscription.unsubscribe());
    });

    // Points reload whenever the dataset, its axes, either filter, the
    // tolerance bands, or the tooltip columns change — the server needs all
    // of these to build a response, unlike the old raw-row fetch.
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
          this.data.set(null);
          this.loading.set(false);
        });
        return;
      }

      untracked(() => {
        this.loading.set(true);
        this.error.set(false);
        this.queryQueue.next();
      });
    });

    this.queryQueue
      .pipe(
        debounceTime(QUERY_DEBOUNCE_MS),
        switchMap(() => {
          const datasetId = this.datasetId();
          const x = this.config().xColumnId;
          const y = this.config().yColumnId;
          if (!datasetId || !x || !y) return EMPTY;

          return this.datasetApi
            .queryChart(datasetId, {
              filter: this.effectiveFilter(),
              xColumnId: x,
              yColumnId: y,
              seriesColumnId: this.config().seriesColumnId,
              toleranceBands: this.config().toleranceBands,
              tooltipColumns: this.config().tooltipColumns,
            })
            .pipe(
              // Caught inside the switchMap: an error reaching the outer stream
              // would tear down the subscription and stop all future reloads.
              catchError(() => {
                this.error.set(true);
                this.loading.set(false);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.data.set(result);
        this.loading.set(false);
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
      if (band.concessionLower !== null) entries.push(line(band.concessionLower, 'Concession lower', '#dc2626'));
      if (band.concessionUpper !== null) entries.push(line(band.concessionUpper, 'Concession upper', '#dc2626'));
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
    return id ? (this.allColumns().find((c) => c.id === id) ?? null) : null;
  }
}

function pointsFor(series: ChartSeriesResult): ScatterPoint[] {
  return series.points.map((p) => ({ value: [p.x, p.y], tooltipLines: p.tooltipLines }));
}

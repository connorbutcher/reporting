import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn, DatasetData } from '../../../../core/models/dataset.model';
import { FilterGroup } from '../../../../core/models/filter.model';
import { ChartWidgetConfig } from '../../../../core/models/report.model';

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

interface ScatterTooltipParams {
  value: [number, number];
  seriesName: string;
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

  private readonly datasetApi = inject(DatasetApiService);

  private readonly allColumns = signal<DatasetColumn[]>([]);
  private readonly data = signal<DatasetData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly datasetId = computed(() => this.config().datasetId);

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
    const groups = new Map<string, [number, number][]>();

    for (const row of this.data()?.rows ?? []) {
      const xv = Number(row.values[x.id]);
      const yv = Number(row.values[y.id]);
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;

      const key = seriesColumn ? row.values[seriesColumn.id]?.trim() || '(blank)' : '';
      const points = groups.get(key);
      if (points) points.push([xv, yv]);
      else groups.set(key, [[xv, yv]]);
    }

    const xLabel = config.xAxisLabel.trim() || x.name;
    const yLabel = config.yAxisLabel.trim() || y.name;
    const names = [...groups.keys()];

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
          `${seriesColumn ? `${params.seriesName}<br/>` : ''}${xLabel}: ${params.value[0]}<br/>${yLabel}: ${params.value[1]}`,
      },
      ...(seriesColumn && config.showLegend ? { legend: { top: 0, data: names } } : {}),
      xAxis: { type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 28 },
      yAxis: { type: 'value', name: yLabel, nameLocation: 'middle', nameGap: 40 },
      series: names.map((name, i) => ({
        name: name || config.title || 'Series',
        type: 'scatter' as const,
        symbolSize: config.pointSize,
        itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
        data: groups.get(name),
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

    // Rows reload whenever the dataset, its axes, or the report filter changes.
    effect(() => {
      const datasetId = this.datasetId();
      this.config().xColumnId;
      this.config().yColumnId;
      this.config().seriesColumnId;
      this.reportFilter();
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
          if (!datasetId) return EMPTY;

          return this.datasetApi.query(datasetId, this.reportFilter()).pipe(
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
        this.data.set({ id: result.id, name: result.name, rows: result.rows });
        this.loading.set(false);
      });
  }

  private columnById(id: string | null): DatasetColumn | null {
    return id ? (this.allColumns().find((c) => c.id === id) ?? null) : null;
  }
}

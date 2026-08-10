import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn, DatasetData } from '../../../../core/models/dataset.model';
import { FilterGroup, combineFilters } from '../../../../core/models/filter.model';
import { ChartToleranceBand, ChartWidgetConfig } from '../../../../core/models/report.model';

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

/** A band's four possible bounds, resolved to concrete numbers from its limits dataset. */
interface ResolvedBand {
  axis: 'x' | 'y';
  min: number;
  max: number;
  concessionLower: number | null;
  concessionUpper: number | null;
}

interface ScatterPoint {
  value: [number, number];
  /** Every column's raw value for this row, so the tooltip can show any of them. */
  extra: Record<string, string>;
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
  private readonly data = signal<DatasetData | null>(null);
  /** Limits datasets referenced by tolerance bands, cached by dataset id. */
  private readonly toleranceSources = signal<Record<string, DatasetData>>({});
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

  private readonly resolvedBands = computed<ResolvedBand[]>(() => {
    const sources = this.toleranceSources();
    return this.config()
      .toleranceBands.map((band) => resolveBand(band, sources))
      .filter((b): b is ResolvedBand => b !== null);
  });

  /** Null until there's a dataset and both axes to actually plot. */
  protected readonly chartOption = computed<EChartsCoreOption | null>(() => {
    const x = this.xColumn();
    const y = this.yColumn();
    if (!x || !y) return null;

    const seriesColumn = this.seriesColumn();
    const config = this.config();
    const groups = new Map<string, ScatterPoint[]>();

    for (const row of this.data()?.rows ?? []) {
      const xv = Number(row.values[x.id]);
      const yv = Number(row.values[y.id]);
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;

      const key = seriesColumn ? row.values[seriesColumn.id]?.trim() || '(blank)' : '';
      const point: ScatterPoint = { value: [xv, yv], extra: row.values };
      const points = groups.get(key);
      if (points) points.push(point);
      else groups.set(key, [point]);
    }

    const xLabel = config.xAxisLabel.trim() || x.name;
    const yLabel = config.yAxisLabel.trim() || y.name;
    const names = [...groups.keys()];
    const tooltipColumns = config.tooltipColumns;
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
        formatter: (params: ScatterTooltipParams) => this.formatTooltip(params, seriesColumn, xLabel, yLabel, tooltipColumns),
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

    // Rows reload whenever the dataset, its axes, or either filter changes.
    effect(() => {
      const datasetId = this.datasetId();
      this.config().xColumnId;
      this.config().yColumnId;
      this.config().seriesColumnId;
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

    // Fetches each limits dataset a tolerance band points at, once per dataset
    // id regardless of how many bands share it.
    effect((onCleanup) => {
      const ids = new Set<string>();
      for (const band of this.config().toleranceBands) {
        if (band.sourceDatasetId) ids.add(band.sourceDatasetId);
      }

      const missing = untracked(() => [...ids].filter((id) => !this.toleranceSources()[id]));
      if (missing.length === 0) return;

      const subs = missing.map((id) =>
        this.datasetApi
          .getData(id)
          .subscribe((data) => this.toleranceSources.update((all) => ({ ...all, [id]: data }))),
      );
      onCleanup(() => subs.forEach((s) => s.unsubscribe()));
    });

    this.queryQueue
      .pipe(
        debounceTime(QUERY_DEBOUNCE_MS),
        switchMap(() => {
          const datasetId = this.datasetId();
          if (!datasetId) return EMPTY;

          return this.datasetApi.query(datasetId, this.effectiveFilter()).pipe(
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

  /** Dashed line entries for every resolved band's bounds, coloured by what crossing them means. */
  private markLineData(): object[] {
    const entries: object[] = [];

    for (const band of this.resolvedBands()) {
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
    tooltipColumns: ChartWidgetConfig['tooltipColumns'],
  ): string {
    const lines = [
      ...(seriesColumn ? [params.seriesName] : []),
      `${xLabel}: ${params.value[0]}`,
      `${yLabel}: ${params.value[1]}`,
    ];

    for (const tc of tooltipColumns) {
      const raw = params.data.extra[tc.columnId];
      if (!raw) continue;
      lines.push(`${tc.prefix ?? ''}${raw}${tc.suffix ?? ''}`);
    }

    return lines.join('<br/>');
  }

  private columnById(id: string | null): DatasetColumn | null {
    return id ? (this.allColumns().find((c) => c.id === id) ?? null) : null;
  }
}

/** Reads a band's four bound numbers off the spec row it points at. */
function resolveBand(band: ChartToleranceBand, sources: Record<string, DatasetData>): ResolvedBand | null {
  if (!band.sourceDatasetId || !band.sourceRowId || !band.minColumnId || !band.maxColumnId) return null;

  const row = sources[band.sourceDatasetId]?.rows.find((r) => r.id === band.sourceRowId);
  if (!row) return null;

  const min = Number(row.values[band.minColumnId]);
  const max = Number(row.values[band.maxColumnId]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  const concessionLower = band.concessionLowerColumnId ? Number(row.values[band.concessionLowerColumnId]) : NaN;
  const concessionUpper = band.concessionUpperColumnId ? Number(row.values[band.concessionUpperColumnId]) : NaN;

  return {
    axis: band.axis,
    min,
    max,
    concessionLower: Number.isFinite(concessionLower) ? concessionLower : null,
    concessionUpper: Number.isFinite(concessionUpper) ? concessionUpper : null,
  };
}

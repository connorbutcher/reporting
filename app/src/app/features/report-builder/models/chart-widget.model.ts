import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset.model';
import {
  ChartToleranceBand,
  ChartTooltipColumn,
  ChartType,
  ChartWidget,
  ChartWidgetConfig,
  DEFAULT_CHART_CONFIG,
} from '../../../core/models/report.model';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter.model';
import { ValidationIssue } from './validation-issue';
import { ModelSources, WidgetModel } from './widget-model-base';

export class ChartWidgetModel extends WidgetModel {
  override readonly type = 'chart' as const;

  readonly chartType = signal<ChartType>('scatter');
  /** Null until the user binds the chart to a dataset. */
  readonly datasetId = signal<string | null>(null);
  readonly xColumnId = signal<string | null>(null);
  readonly yColumnId = signal<string | null>(null);
  /** Splits points into a separate coloured series per distinct value. Null plots one series. */
  readonly seriesColumnId = signal<string | null>(null);
  readonly xAxisLabel = signal('');
  readonly yAxisLabel = signal('');
  readonly showLegend = signal(true);
  readonly pointSize = signal(8);

  /** Reference lines per spec, each resolved against its own limits dataset. */
  readonly toleranceBands = signal<readonly ChartToleranceBand[]>([]);
  /** Extra fields shown in a point's tooltip, beyond X/Y. */
  readonly tooltipColumns = signal<readonly ChartTooltipColumn[]>([]);
  /** Rows this chart plots, narrowed server-side. */
  readonly filter: FilterGroupModel;

  /** The bound dataset's schema, once loaded. */
  readonly schema: Signal<DatasetSchema | null>;
  /** Columns the axes can plot — only numeric types make sense on a scatter chart. */
  readonly numericColumns: Signal<DatasetColumn[]>;

  constructor(widget: ChartWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;

    this.chartType.set(config.chartType);
    this.datasetId.set(config.datasetId);
    this.xColumnId.set(config.xColumnId);
    this.yColumnId.set(config.yColumnId);
    this.seriesColumnId.set(config.seriesColumnId);
    this.xAxisLabel.set(config.xAxisLabel);
    this.yAxisLabel.set(config.yAxisLabel);
    this.showLegend.set(config.showLegend);
    this.pointSize.set(config.pointSize);
    this.toleranceBands.set(config.toleranceBands ?? []);
    this.tooltipColumns.set(config.tooltipColumns ?? []);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });
    this.numericColumns = computed(
      () => this.schema()?.columns.filter((c) => c.type === 'int' || c.type === 'double') ?? [],
    );

    this.filter = new FilterGroupModel(config.filter ?? null, {
      schema: this.schema,
      catalogue: sources.catalogue,
      // Unlike a table, a chart doesn't show an enumerable set of columns, so
      // its filter offers the whole dataset rather than a narrowed list.
      view: { kind: 'widgetFilters', widgetId: this.id },
      ownerId: this.id,
      widgetId: this.id,
    });
  }

  /** Swapping dataset invalidates every column choice, since they belong to the old schema. */
  setDataset(datasetId: string | null): void {
    if (datasetId === this.datasetId()) return;
    this.datasetId.set(datasetId);
    this.xColumnId.set(null);
    this.yColumnId.set(null);
    this.seriesColumnId.set(null);
    this.tooltipColumns.set([]);
    this.filter.clear();
  }

  addToleranceBand(): string {
    const band: ChartToleranceBand = {
      id: crypto.randomUUID(),
      axis: 'y',
      sourceDatasetId: '',
      sourceRowId: '',
      minColumnId: '',
      maxColumnId: '',
    };
    this.toleranceBands.update((bands) => [...bands, band]);
    return band.id;
  }

  removeToleranceBand(id: string): void {
    this.toleranceBands.update((bands) => bands.filter((b) => b.id !== id));
  }

  updateToleranceBand(id: string, patch: Partial<Omit<ChartToleranceBand, 'id'>>): void {
    this.toleranceBands.update((bands) => bands.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  toleranceBand(id: string): ChartToleranceBand | null {
    return this.toleranceBands().find((b) => b.id === id) ?? null;
  }

  /** Adds the first dataset column not already shown in the tooltip. */
  addTooltipColumn(): void {
    const used = new Set(this.tooltipColumns().map((c) => c.columnId));
    const next = (this.schema()?.columns ?? []).find((c) => !used.has(c.id));
    if (!next) return;
    this.tooltipColumns.update((cols) => [...cols, { columnId: next.id }]);
  }

  removeTooltipColumn(columnId: string): void {
    this.tooltipColumns.update((cols) => cols.filter((c) => c.columnId !== columnId));
  }

  updateTooltipColumn(columnId: string, patch: Partial<Omit<ChartTooltipColumn, 'columnId'>>): void {
    this.tooltipColumns.update((cols) =>
      cols.map((c) => (c.columnId === columnId ? { ...c, ...patch } : c)),
    );
  }

  /** Swaps which column an existing tooltip entry shows, dropping a duplicate if that column is already added. */
  replaceTooltipColumn(oldColumnId: string, newColumnId: string): void {
    if (oldColumnId === newColumnId) return;
    this.tooltipColumns.update((cols) =>
      cols
        .filter((c) => c.columnId !== newColumnId)
        .map((c) => (c.columnId === oldColumnId ? { ...c, columnId: newColumnId } : c)),
    );
  }

  override toDto(): ChartWidget {
    const config: ChartWidgetConfig = {
      type: 'chart',
      ...DEFAULT_CHART_CONFIG,
      ...this.baseConfigDto(),
      chartType: this.chartType(),
      datasetId: this.datasetId(),
      xColumnId: this.xColumnId(),
      yColumnId: this.yColumnId(),
      seriesColumnId: this.seriesColumnId(),
      xAxisLabel: this.xAxisLabel(),
      yAxisLabel: this.yAxisLabel(),
      showLegend: this.showLegend(),
      pointSize: this.pointSize(),
      // A band the user hasn't finished pointing at a spec yet is left out — the
      // server's Guid fields can't parse the empty placeholder, and a half-built
      // band shouldn't block autosave. It stays in the signal above so the panel
      // that's mid-edit can still find it.
      toleranceBands: this.toleranceBands()
        .filter((b) => b.sourceDatasetId && b.sourceRowId && b.minColumnId && b.maxColumnId)
        .map((b) => ({ ...b })),
      tooltipColumns: this.tooltipColumns().map((c) => ({ ...c })),
      filter: this.filter.toDto(),
    };
    return { ...this.geometryDto(), type: 'chart', config };
  }

  protected override defaultTitle(): string {
    return 'Chart';
  }

  protected override childNodes(): readonly EditorNode[] {
    return [this.filter];
  }

  protected override ownIssues(): ValidationIssue[] {
    const name = this.label();

    if (!this.datasetId()) {
      return [
        {
          id: `${this.id}:noDataset`,
          severity: 'warning',
          title: `${name} has no dataset`,
          detail: 'Pick a dataset so the chart has something to plot.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    if (!this.xColumnId() || !this.yColumnId()) {
      return [
        {
          id: `${this.id}:noAxes`,
          severity: 'warning',
          title: `${name} is missing an axis`,
          detail: 'Pick both an X and a Y column to plot.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    return [];
  }
}

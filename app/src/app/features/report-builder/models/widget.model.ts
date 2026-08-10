import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset.model';
import {
  ChartToleranceBand,
  ChartTooltipColumn,
  ChartType,
  ChartWidget,
  ChartWidgetConfig,
  DEFAULT_CHART_CONFIG,
  DEFAULT_TABLE_CONFIG,
  DEFAULT_TEXT_CONFIG,
  DataTableWidget,
  DataTableWidgetConfig,
  SortDirection,
  StaticTextWidget,
  StaticTextWidgetConfig,
  Widget,
  WidgetType,
} from '../../../core/models/report.model';
import { OperatorCatalogue } from '../../../core/models/filter.model';
import { GridRect } from '../grid.util';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter.model';
import { TableAppearanceModel } from './table-appearance.model';
import { TableColumnModel } from './table-column.model';
import { TextStyleModel } from './text-style.model';
import { ValidationIssue } from './validation-issue';

/** Look-up of dataset schemas, supplied by the store's cache. */
export type SchemaSource = Signal<Record<string, DatasetSchema>>;

/** Filter operators per column type, supplied by the store once fetched. */
export type CatalogueSource = Signal<OperatorCatalogue | null>;

/** The shared look-ups every model node needs to describe and validate itself. */
export interface ModelSources {
  readonly schemas: SchemaSource;
  readonly catalogue: CatalogueSource;
}

/** Shared behaviour for anything that can sit on the report grid. */
export abstract class WidgetModel extends EditorNode {
  readonly id: string;
  readonly x = signal(0);
  readonly y = signal(0);
  readonly w = signal(1);
  readonly h = signal(1);
  readonly title = signal('');
  readonly showTitle = signal(true);

  abstract readonly type: WidgetType;

  /** Title actually shown, falling back to the widget kind. */
  readonly label: Signal<string>;

  /** Current footprint on the grid, for collision and bounds checks. */
  readonly rect: Signal<GridRect>;

  protected constructor(widget: Widget) {
    super();
    this.id = widget.id;
    this.x.set(widget.x);
    this.y.set(widget.y);
    this.w.set(widget.w);
    this.h.set(widget.h);
    this.title.set(widget.config.title);
    this.showTitle.set(widget.config.showTitle);

    this.label = computed(() => this.title().trim() || this.defaultTitle());
    this.rect = computed(() => ({ x: this.x(), y: this.y(), w: this.w(), h: this.h() }));
  }

  protected abstract defaultTitle(): string;

  moveTo(x: number, y: number): void {
    this.x.set(Math.max(0, Math.round(x)));
    this.y.set(Math.max(0, Math.round(y)));
  }

  resizeTo(w: number, h: number): void {
    this.w.set(Math.max(1, Math.round(w)));
    this.h.set(Math.max(1, Math.round(h)));
  }

  abstract toDto(): Widget;

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  /** Geometry common to both widget kinds. */
  protected geometryDto() {
    return { id: this.id, x: this.x(), y: this.y(), w: this.w(), h: this.h() };
  }

  protected baseConfigDto() {
    return { title: this.title(), showTitle: this.showTitle() };
  }
}

export class DataTableWidgetModel extends WidgetModel {
  override readonly type = 'dataTable' as const;

  /** Null until the user binds the table to a dataset. */
  readonly datasetId = signal<string | null>(null);
  readonly sortColumnId = signal<string | null>(null);
  readonly sortDirection = signal<SortDirection>('asc');

  readonly appearance: TableAppearanceModel;
  readonly columns = signal<readonly TableColumnModel[]>([]);

  /** Rows this widget shows, narrowed server-side. */
  readonly filter: FilterGroupModel;

  /** The bound dataset's schema, once loaded. */
  readonly schema: Signal<DatasetSchema | null>;
  /** Dataset columns not yet placed on the table. */
  readonly availableColumns: Signal<DatasetSchema['columns']>;

  constructor(widget: DataTableWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;

    this.datasetId.set(config.datasetId);
    this.sortColumnId.set(config.sortColumnId);
    this.sortDirection.set(config.sortDirection);
    this.appearance = new TableAppearanceModel(this.id, config);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });

    this.columns.set(config.columns.map((c) => new TableColumnModel(this.id, c, this.schema)));

    this.filter = new FilterGroupModel(config.filter ?? null, {
      schema: this.schema,
      catalogue: sources.catalogue,
      // A table's filter narrows what that table shows, so it only offers the
      // columns actually on it — the dataset's other columns belong to the
      // report-level filter.
      columns: computed(() =>
        this.columns()
          .map((c) => c.schemaColumn())
          .filter((c): c is NonNullable<typeof c> => !!c),
      ),
      view: { kind: 'widgetFilters', widgetId: this.id },
      ownerId: this.id,
      widgetId: this.id,
    });

    this.availableColumns = computed(() => {
      const used = new Set(this.columns().map((c) => c.columnId));
      return this.schema()?.columns.filter((c) => !used.has(c.id)) ?? [];
    });
  }

  /** Swapping dataset invalidates every column choice, the sort, and the filter. */
  setDataset(datasetId: string | null): void {
    if (datasetId === this.datasetId()) return;
    this.datasetId.set(datasetId);
    this.columns.set([]);
    this.sortColumnId.set(null);
    this.filter.clear();
  }

  addColumn(columnId: string): void {
    this.addColumns([columnId]);
  }

  /** Appends several columns in one step, skipping any already on the table. */
  addColumns(columnIds: readonly string[]): void {
    const existing = new Set(this.columns().map((c) => c.columnId));
    const added = columnIds
      .filter((id) => !existing.has(id))
      .map((id) => new TableColumnModel(this.id, { columnId: id }, this.schema));

    if (added.length === 0) return;
    this.columns.update((columns) => [...columns, ...added]);
  }

  removeColumn(columnId: string): void {
    this.columns.update((columns) => columns.filter((c) => c.columnId !== columnId));
    if (this.sortColumnId() === columnId) this.sortColumnId.set(null);
  }

  moveColumn(index: number, offset: number): void {
    const columns = [...this.columns()];
    const target = index + offset;
    if (target < 0 || target >= columns.length) return;

    [columns[index], columns[target]] = [columns[target], columns[index]];
    this.columns.set(columns);
  }

  column(columnId: string): TableColumnModel | null {
    return this.columns().find((c) => c.columnId === columnId) ?? null;
  }

  setSort(columnId: string, direction: SortDirection): void {
    this.sortColumnId.set(columnId);
    this.sortDirection.set(direction);
  }

  /** Applies widths measured after a drag-resize, ignoring unknown columns. */
  applyColumnWidths(widths: readonly { columnId: string; width: number }[]): void {
    for (const { columnId, width } of widths) this.column(columnId)?.setWidth(width);
  }

  override toDto(): DataTableWidget {
    const config: DataTableWidgetConfig = {
      type: 'dataTable',
      ...DEFAULT_TABLE_CONFIG,
      ...this.baseConfigDto(),
      ...this.appearance.toDto(),
      datasetId: this.datasetId(),
      columns: this.columns().map((c) => c.toDto()),
      sortColumnId: this.sortColumnId(),
      sortDirection: this.sortDirection(),
      filter: this.filter.toDto(),
    };
    return { ...this.geometryDto(), type: 'dataTable', config };
  }

  protected override defaultTitle(): string {
    return 'Table';
  }

  protected override childNodes(): readonly EditorNode[] {
    return [this.appearance, this.filter, ...this.columns()];
  }

  protected override ownIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const name = this.label();

    const seen = new Set<string>();
    if (this.columns().some((c) => !seen.add(c.columnId))) {
      issues.push({
        id: `${this.id}:duplicateColumn`,
        severity: 'error',
        title: `${name} has a duplicated column`,
        detail: 'The same dataset column has been added more than once.',
        widgetId: this.id,
        view: { kind: 'widgetColumns', widgetId: this.id },
      });
    }

    if (!this.datasetId()) {
      issues.push({
        id: `${this.id}:noDataset`,
        severity: 'warning',
        title: `${name} has no dataset`,
        detail: 'Pick a dataset so the table has something to show.',
        widgetId: this.id,
        view: { kind: 'widget', widgetId: this.id },
      });
      return issues;
    }

    if (this.columns().length === 0) {
      issues.push({
        id: `${this.id}:noColumns`,
        severity: 'warning',
        title: `${name} has no columns`,
        detail: 'Add the columns you want the table to show.',
        widgetId: this.id,
        view: { kind: 'widgetColumns', widgetId: this.id },
      });
    }

    const sortColumnId = this.sortColumnId();
    if (sortColumnId && !this.columns().some((c) => c.columnId === sortColumnId)) {
      issues.push({
        id: `${this.id}:sortColumn`,
        severity: 'warning',
        title: `${name} sorts by a column it doesn't show`,
        detail: 'Add that column back, or sort by one that is displayed.',
        widgetId: this.id,
        view: { kind: 'widgetColumns', widgetId: this.id },
      });
    }

    return issues;
  }
}

export class StaticTextWidgetModel extends WidgetModel {
  override readonly type = 'staticText' as const;

  readonly content = signal('');
  readonly style: TextStyleModel;

  constructor(widget: StaticTextWidget) {
    super(widget);
    this.content.set(widget.config.content);
    this.style = new TextStyleModel(widget.config);
  }

  override toDto(): StaticTextWidget {
    const config: StaticTextWidgetConfig = {
      type: 'staticText',
      ...DEFAULT_TEXT_CONFIG,
      ...this.baseConfigDto(),
      ...this.style.toDto(),
      content: this.content(),
    };
    return { ...this.geometryDto(), type: 'staticText', config };
  }

  protected override defaultTitle(): string {
    return 'Text';
  }

  protected override childNodes(): readonly EditorNode[] {
    return [this.style];
  }

  protected override ownIssues(): ValidationIssue[] {
    if (this.content().trim().length > 0) return [];

    return [
      {
        id: `${this.id}:noContent`,
        severity: 'warning',
        title: `${this.label()} has no text`,
        detail: 'Add the text this widget should show.',
        widgetId: this.id,
        view: { kind: 'widget', widgetId: this.id },
      },
    ];
  }
}

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

/** Rebuilds the right model class for a stored widget. */
export function widgetModelFromDto(widget: Widget, sources: ModelSources): WidgetModel {
  switch (widget.type) {
    case 'dataTable':
      return new DataTableWidgetModel(widget, sources);
    case 'chart':
      return new ChartWidgetModel(widget, sources);
    default:
      return new StaticTextWidgetModel(widget);
  }
}

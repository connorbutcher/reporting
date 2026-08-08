import { Signal, computed, signal } from '@angular/core';
import { DatasetSchema } from '../../../core/models/dataset.model';
import {
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

    this.filter = new FilterGroupModel(config.filter ?? null, {
      schema: this.schema,
      catalogue: sources.catalogue,
      view: { kind: 'widgetFilters', widgetId: this.id },
      ownerId: this.id,
      widgetId: this.id,
    });

    this.columns.set(config.columns.map((c) => new TableColumnModel(this.id, c, this.schema)));

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

/** Rebuilds the right model class for a stored widget. */
export function widgetModelFromDto(widget: Widget, sources: ModelSources): WidgetModel {
  return widget.type === 'dataTable'
    ? new DataTableWidgetModel(widget, sources)
    : new StaticTextWidgetModel(widget);
}

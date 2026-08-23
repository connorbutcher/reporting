import { Signal, computed, signal } from '@angular/core';
import { DatasetSchema } from '../../../core/models/dataset';
import {
  DEFAULT_TABLE_CONFIG,
  DataTableWidget,
  DataTableWidgetConfig,
  SortDirection,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter.model';
import { ModelSources, WidgetModel } from './widget-model-base';
import { TableAppearanceModel } from './table-appearance.model';
import { TableColumnModel } from './table-column.model';
import { ValidationIssue } from './validation-issue';

export class DataTableWidgetModel extends WidgetModel {
  override readonly type = 'dataTable' as const;

  /** Null until the user binds the table to a dataset. */
  readonly datasetId = signal<number | null>(null);
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
  setDataset(datasetId: number | null): void {
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

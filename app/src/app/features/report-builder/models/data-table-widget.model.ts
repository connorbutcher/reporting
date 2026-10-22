import { Signal, computed, signal } from '@angular/core';
import { DatasetSchema } from '../../../core/models/dataset';
import {
  DEFAULT_TABLE_CONFIG,
  DataTableWidget,
  DataTableWidgetConfig,
  SortDirection,
  hasFixedLimits,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter';
import { WidgetModel } from './widget-model-base';
import { ModelSources } from './sources/model-sources';
import { SchemaSource } from './sources/schema-source';
import { TableAppearanceModel } from './table-appearance.model';
import { TableColumnModel } from './table-column.model';
import { PanelView } from '../side-panel/panel-view';
import { ValidationIssue } from './validation-issue';

export class DataTableWidgetModel extends WidgetModel {
  public override readonly type = 'dataTable' as const;
  public readonly datasetId = signal<number | null>(null);
  public readonly sortColumnId = signal<string | null>(null);
  public readonly sortDirection = signal<SortDirection>('asc');
  public readonly appearance: TableAppearanceModel;
  public readonly columns = signal<readonly TableColumnModel[]>([]);
  public readonly filter: FilterGroupModel;
  public readonly schema: Signal<DatasetSchema | null>;
  public readonly availableColumns: Signal<DatasetSchema['columns']>;

  /** Kept so columns added later get the same tolerance-schema look-up. */
  private readonly schemas: SchemaSource;

  constructor(widget: DataTableWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;
    this.schemas = sources.schemas;

    this.datasetId.set(config.datasetId);
    this.sortColumnId.set(config.sortColumnId);
    this.sortDirection.set(config.sortDirection);
    this.appearance = new TableAppearanceModel(this.id, config);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });

    this.columns.set(
      config.columns.map((c) => new TableColumnModel(this.id, c, this.schema, sources.schemas)),
    );

    this.filter = new FilterGroupModel(config.filter ?? null, {
      schema: this.schema,
      catalogue: sources.catalogue,
      // A table's filter offers only its own columns; the rest belong to the report filter.
      columns: computed(() =>
        this.columns()
          .map((c) => c.schemaColumn())
          .filter((c): c is NonNullable<typeof c> => !!c),
      ),
      // Columns with fixed banding can be filtered in or out of tolerance; per-row limits have no single band.
      tolerantColumns: computed(
        () =>
          new Set(
            this.columns()
              .filter((c) => hasFixedLimits(c.tolerance()))
              .map((c) => c.columnId),
          ),
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

  /** Clears every column choice, the sort and the filter. */
  public setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) {
      return;
    }
    this.datasetId.set(datasetId);
    this.columns.set([]);
    this.sortColumnId.set(null);
    this.filter.clear();
  }

  public addColumn(columnId: string): void {
    this.addColumns([columnId]);
  }

  /** Skips columns already on the table. */
  public addColumns(columnIds: readonly string[]): void {
    const existing = new Set(this.columns().map((c) => c.columnId));
    const added = columnIds
      .filter((id) => !existing.has(id))
      .map((id) => new TableColumnModel(this.id, { columnId: id }, this.schema, this.schemas));

    if (added.length === 0) {
      return;
    }
    this.columns.update((columns) => [...columns, ...added]);
  }

  public removeColumn(columnId: string): void {
    this.columns.update((columns) => columns.filter((c) => c.columnId !== columnId));
    if (this.sortColumnId() === columnId) {
      this.sortColumnId.set(null);
    }
  }

  public moveColumn(index: number, offset: number): void {
    const columns = [...this.columns()];
    const target = index + offset;
    if (target < 0 || target >= columns.length) {
      return;
    }

    [columns[index], columns[target]] = [columns[target], columns[index]];
    this.columns.set(columns);
  }

  /** For a header drag reorder. */
  public reorderColumn(draggedColumnId: string, targetColumnId: string): void {
    const columns = [...this.columns()];
    const from = columns.findIndex((c) => c.columnId === draggedColumnId);
    const to = columns.findIndex((c) => c.columnId === targetColumnId);
    if (from < 0 || to < 0 || from === to) {
      return;
    }

    const [moved] = columns.splice(from, 1);
    columns.splice(to, 0, moved);
    this.columns.set(columns);
  }

  public column(columnId: string): TableColumnModel | null {
    return this.columns().find((c) => c.columnId === columnId) ?? null;
  }

  public setSort(columnId: string, direction: SortDirection): void {
    this.sortColumnId.set(columnId);
    this.sortDirection.set(direction);
  }

  /** Ignores unknown columns. */
  public applyColumnWidths(widths: readonly { columnId: string; width: number }[]): void {
    for (const { columnId, width } of widths) {
      this.column(columnId)?.setWidth(width);
    }
  }

  public override toDto(): DataTableWidget {
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

  public override defaultTitle(): string {
    return 'Table';
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.appearance, this.filter, ...this.columns()];
  }

  public override ownIssues(): ValidationIssue[] {
    const duplicate = this.duplicateColumnIssue();
    if (!this.datasetId()) {
      const noDataset = this.issue(
        'noDataset',
        'warning',
        `${this.label()} has no dataset`,
        'Pick a dataset so the table has something to show.',
      );
      return duplicate ? [duplicate, noDataset] : [noDataset];
    }
    return [duplicate, this.noColumnsIssue(), this.sortColumnIssue()].filter(
      (issue): issue is ValidationIssue => !!issue,
    );
  }

  private duplicateColumnIssue(): ValidationIssue | null {
    const seen = new Set<string>();
    if (!this.columns().some((c) => !seen.add(c.columnId))) {
      return null;
    }
    return this.issue(
      'duplicateColumn',
      'error',
      `${this.label()} has a duplicated column`,
      'The same dataset column has been added more than once.',
      this.columnsView(),
    );
  }

  private noColumnsIssue(): ValidationIssue | null {
    if (this.columns().length > 0) {
      return null;
    }
    return this.issue(
      'noColumns',
      'warning',
      `${this.label()} has no columns`,
      'Add the columns you want the table to show.',
      this.columnsView(),
    );
  }

  /** Sorting by a hidden column is a warning; sorting by a column the dataset no longer has is broken. */
  private sortColumnIssue(): ValidationIssue | null {
    const sortColumnId = this.sortColumnId();
    if (!sortColumnId || this.column(sortColumnId)) {
      return null;
    }

    const schema = this.schema();
    if (schema && !schema.columns.some((c) => c.id === sortColumnId)) {
      return this.issue(
        'sortColumnMissing',
        'error',
        `${this.label()} sorts by a column that no longer exists`,
        'That dataset column was removed. Pick a different sort column.',
        this.columnsView(),
      );
    }
    return this.issue(
      'sortColumn',
      'warning',
      `${this.label()} sorts by a column it doesn't show`,
      'Add that column back, or sort by one that is displayed.',
      this.columnsView(),
    );
  }

  private columnsView(): PanelView {
    return { kind: 'widgetColumns', widgetId: this.id };
  }
}

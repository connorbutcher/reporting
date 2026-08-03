import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset.model';
import { ColumnAlign, DataTableColumnSetting } from '../../../core/models/report.model';
import { EditorNode } from './editor-node';
import { ValidationIssue } from './validation-issue';

/** One column placed on a table, owning how that column is presented. */
export class TableColumnModel extends EditorNode {
  readonly columnId: string;

  /** Blank falls back to the dataset column's own name. */
  readonly header = signal<string>('');
  readonly width = signal<number | null>(null);
  /** Null follows the column's type: right for numbers, left otherwise. */
  readonly align = signal<ColumnAlign | null>(null);
  readonly sortable = signal(true);

  /** The dataset column this refers to, once the schema has loaded. */
  readonly schemaColumn: Signal<DatasetColumn | null>;

  /** The label actually rendered in the table header. */
  readonly label: Signal<string>;

  constructor(
    private readonly widgetId: string,
    dto: DataTableColumnSetting,
    private readonly schema: Signal<DatasetSchema | null>,
  ) {
    super();
    this.columnId = dto.columnId;
    this.header.set(dto.header ?? '');
    this.width.set(dto.width ?? null);
    this.align.set(dto.align ?? null);
    this.sortable.set(dto.sortable !== false);

    this.schemaColumn = computed(
      () => this.schema()?.columns.find((c) => c.id === this.columnId) ?? null,
    );
    this.label = computed(() => this.header().trim() || this.schemaColumn()?.name || 'Unknown column');
  }

  setWidth(width: number | null): void {
    this.width.set(width === null || !Number.isFinite(width) ? null : Math.round(width));
  }

  toDto(): DataTableColumnSetting {
    const header = this.header().trim();
    return {
      columnId: this.columnId,
      ...(header ? { header } : {}),
      ...(this.width() !== null ? { width: this.width()! } : {}),
      ...(this.align() !== null ? { align: this.align()! } : {}),
      sortable: this.sortable(),
    };
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return [];
  }

  protected override ownIssues(): ValidationIssue[] {
    // Only meaningful once the schema is known; a pending fetch must not look
    // like a column that has been deleted from the dataset.
    if (!this.schema() || this.schemaColumn()) return [];

    return [
      {
        id: `${this.widgetId}:column:${this.columnId}:missing`,
        severity: 'error',
        title: `A column is no longer in "${this.schema()!.name}"`,
        detail: 'The dataset column was removed. Take it off the table to fix the report.',
        widgetId: this.widgetId,
        view: { kind: 'widgetColumns', widgetId: this.widgetId },
      },
    ];
  }
}

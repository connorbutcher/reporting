import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  ColumnAlign,
  DataTableColumnSetting,
  ToleranceConfig,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { ValidationIssue } from './validation-issue';
import { SchemaSource } from './widget-model-base';

/** One column placed on a table, owning how that column is presented. */
export class TableColumnModel extends EditorNode {
  readonly columnId: string;

  /** Blank falls back to the dataset column's own name. */
  readonly header = signal<string>('');
  readonly width = signal<number | null>(null);
  /** Null follows the column's type: right for numbers, left otherwise. */
  readonly align = signal<ColumnAlign | null>(null);
  readonly sortable = signal(true);
  /** Pass/fail highlighting resolved against a row of a separate limits dataset. Null shows no banding. */
  readonly tolerance = signal<ToleranceConfig | null>(null);

  /** The dataset column this refers to, once the schema has loaded. */
  readonly schemaColumn: Signal<DatasetColumn | null>;

  /** The label actually rendered in the table header. */
  readonly label: Signal<string>;

  /**
   * The tolerance's own "limits" dataset schema, once loaded — separate from {@link schema},
   * which is this column's dataset (the one the tolerance's own column, above, belongs to).
   * Null while the banding is off, pending, or points at nothing yet.
   */
  private readonly toleranceSchema: Signal<DatasetSchema | null>;

  constructor(
    private readonly widgetId: string,
    dto: DataTableColumnSetting,
    private readonly schema: Signal<DatasetSchema | null>,
    schemas: SchemaSource,
  ) {
    super();
    this.columnId = dto.columnId;
    this.header.set(dto.header ?? '');
    this.width.set(dto.width ?? null);
    this.align.set(dto.align ?? null);
    this.sortable.set(dto.sortable !== false);
    this.tolerance.set(dto.tolerance ?? null);

    this.schemaColumn = computed(
      () => this.schema()?.columns.find((c) => c.id === this.columnId) ?? null,
    );
    this.label = computed(
      () => this.header().trim() || this.schemaColumn()?.name || 'Unknown column',
    );
    this.toleranceSchema = computed(() => {
      const sourceId = this.tolerance()?.sourceDatasetId;
      return sourceId ? (schemas()[sourceId] ?? null) : null;
    });
  }

  setWidth(width: number | null): void {
    this.width.set(width === null || !Number.isFinite(width) ? null : Math.round(width));
  }

  setTolerance(tolerance: ToleranceConfig | null): void {
    this.tolerance.set(tolerance);
  }

  toDto(): DataTableColumnSetting {
    const header = this.header().trim();
    return {
      columnId: this.columnId,
      ...(header ? { header } : {}),
      ...(this.width() !== null ? { width: this.width()! } : {}),
      ...(this.align() !== null ? { align: this.align()! } : {}),
      sortable: this.sortable(),
      ...(this.tolerance() ? { tolerance: this.tolerance()! } : {}),
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
    if (this.schema() && !this.schemaColumn()) {
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

    // The tolerance's own min/max/concession columns point at a *different* ("limits") dataset,
    // so they're checked against that dataset's schema rather than this column's own. A per-row
    // match adds one column on each side: its identifier in the limits dataset, and the table's own.
    const tolerance = this.tolerance();
    const toleranceSchema = this.toleranceSchema();
    if (tolerance && toleranceSchema) {
      const columnIds = new Set(toleranceSchema.columns.map((c) => c.id));
      const pointers = [
        tolerance.minColumnId,
        tolerance.maxColumnId,
        tolerance.concessionLowerColumnId,
        tolerance.concessionUpperColumnId,
        tolerance.match?.sourceColumnId,
      ].filter((id): id is string => !!id);
      const ownSchema = this.schema();
      const matchColumnGone =
        !!tolerance.match &&
        !!ownSchema &&
        !ownSchema.columns.some((c) => c.id === tolerance.match!.columnId);

      if (pointers.some((id) => !columnIds.has(id)) || matchColumnGone) {
        return [
          {
            id: `${this.widgetId}:column:${this.columnId}:toleranceMissing`,
            severity: 'error',
            title: `"${this.label()}"'s tolerance points at a removed column`,
            detail: `A column this tolerance uses (in "${toleranceSchema.name}" or in this table's own dataset) has been removed. Re-point it or remove the banding.`,
            widgetId: this.widgetId,
            view: { kind: 'columnTolerance', widgetId: this.widgetId, columnId: this.columnId },
          },
        ];
      }
    }

    return [];
  }
}

import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  Aggregate,
  ColumnAlign,
  DataTableColumnSetting,
  FormatRule,
  ToleranceConfig,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { ValidationIssue } from './validation-issue';
import { SchemaSource } from './sources/schema-source';

export class TableColumnModel extends EditorNode {
  public readonly columnId: string;

  /** Blank falls back to the dataset column's name. */
  public readonly header = signal<string>('');
  public readonly width = signal<number | null>(null);
  /** Null follows the type: right for numbers, left otherwise. */
  public readonly align = signal<ColumnAlign | null>(null);
  public readonly sortable = signal(true);
  /** Pass/fail highlighting against a row of a separate limits dataset; null shows none. */
  public readonly tolerance = signal<ToleranceConfig | null>(null);
  /** The totals-row aggregate; null leaves this column's total blank. */
  public readonly total = signal<Aggregate | null>(null);
  public readonly wrap = signal(false);
  public readonly dataBars = signal(false);
  /** Checked in order; the first rule a value matches wins. */
  public readonly formatRules = signal<readonly FormatRule[]>([]);
  public readonly schemaColumn: Signal<DatasetColumn | null>;
  public readonly label: Signal<string>;

  /** The tolerance's own limits dataset; null while banding is off, pending or unset. */
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
    this.total.set(dto.total ?? null);
    this.wrap.set(!!dto.wrap);
    this.dataBars.set(!!dto.dataBars);
    this.formatRules.set(dto.formatRules ?? []);

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

  public setWidth(width: number | null): void {
    this.width.set(width === null || !Number.isFinite(width) ? null : Math.round(width));
  }

  public setTolerance(tolerance: ToleranceConfig | null): void {
    this.tolerance.set(tolerance);
  }

  public toDto(): DataTableColumnSetting {
    const header = this.header().trim();
    return {
      columnId: this.columnId,
      ...(header ? { header } : {}),
      ...(this.width() !== null ? { width: this.width()! } : {}),
      ...(this.align() !== null ? { align: this.align()! } : {}),
      sortable: this.sortable(),
      ...(this.tolerance() ? { tolerance: this.tolerance()! } : {}),
      ...(this.total() ? { total: this.total()! } : {}),
      ...(this.wrap() ? { wrap: true } : {}),
      ...(this.dataBars() ? { dataBars: true } : {}),
      ...(this.formatRules().length
        ? { formatRules: this.formatRules().map((r) => ({ ...r })) }
        : {}),
    };
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public override childNodes(): readonly EditorNode[] {
    return [];
  }

  public override ownIssues(): ValidationIssue[] {
    // A pending schema fetch must not look like a deleted column.
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

    // Tolerance columns point at the limits dataset, so they're checked against its schema. A per-row
    // match adds the identifier column on each side.
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

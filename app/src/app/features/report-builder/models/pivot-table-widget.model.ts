import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  WidgetConfigDefaults,
  DateGrouping,
  PivotAggregate,
  PivotFieldGrouping,
  PivotMeasure,
  PivotTableWidget,
  PivotTableWidgetConfig,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter';
import { WidgetModel } from './widget-model-base';
import { ModelSources } from './sources/model-sources';
import { ValidationIssue } from './validation-issue';
import { ColumnTypes } from './column-types';

/** A pivot table: one dataset, rows grouped by `rowFields` and reduced to one or more `measures`. */
export class PivotTableWidgetModel extends WidgetModel {
  public override readonly type = 'pivotTable' as const;

  public readonly datasetId = signal<number | null>(null);
  public readonly rowFields = signal<readonly string[]>([]);
  /** Column ids spread across the top, in order. */
  public readonly columnFields = signal<readonly string[]>([]);
  /** Date fields grouped by period. */
  public readonly fieldGroupings = signal<readonly PivotFieldGrouping[]>([]);
  public readonly measures = signal<readonly PivotMeasure[]>([]);
  /** Null orders rows by their dimensions. */
  public readonly sortMeasureId = signal<string | null>(null);
  public readonly sortDescending = signal(true);
  public readonly showGrandTotal = signal(true);
  public readonly showSubtotals = signal(false);

  public readonly filter: FilterGroupModel;

  public readonly schema: Signal<DatasetSchema | null>;
  public readonly columns: Signal<DatasetColumn[]>;
  public readonly numericColumns: Signal<DatasetColumn[]>;
  /** Columns not already used as a row or column field. */
  public readonly availableRowFields: Signal<DatasetColumn[]>;
  public readonly availableColumnFields: Signal<DatasetColumn[]>;

  constructor(widget: PivotTableWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;

    this.datasetId.set(config.datasetId);
    this.rowFields.set([...config.rowFields]);
    this.columnFields.set([...(config.columnFields ?? [])]);
    this.fieldGroupings.set((config.fieldGroupings ?? []).map((g) => ({ ...g })));
    this.measures.set(config.measures.map((m) => ({ ...m })));
    this.sortMeasureId.set(config.sortMeasureId ?? null);
    this.sortDescending.set(config.sortDescending ?? true);
    this.showGrandTotal.set(config.showGrandTotal);
    this.showSubtotals.set(config.showSubtotals ?? false);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });
    this.columns = computed(() => this.schema()?.columns ?? []);
    this.numericColumns = computed(() =>
      this.columns().filter((c) => ColumnTypes.isNumeric(c.type)),
    );
    this.availableRowFields = computed(() => {
      const used = new Set([...this.rowFields(), ...this.columnFields()]);
      return this.columns().filter((c) => !used.has(c.id));
    });
    this.availableColumnFields = this.availableRowFields;

    this.filter = new FilterGroupModel(config.filter ?? null, {
      schema: this.schema,
      catalogue: sources.catalogue,
      // A pivot can filter on any column, not only the ones it groups by.
      columns: this.columns,
      view: { kind: 'widgetFilters', widgetId: this.id },
      ownerId: this.id,
      widgetId: this.id,
    });
  }

  /** Clears every column choice and the filter. */
  public setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) {
      return;
    }
    this.datasetId.set(datasetId);
    this.rowFields.set([]);
    this.columnFields.set([]);
    this.fieldGroupings.set([]);
    this.measures.set([]);
    this.sortMeasureId.set(null);
    this.filter.clear();
  }

  public addRowField(columnId: string): void {
    if (this.rowFields().includes(columnId) || this.columnFields().includes(columnId)) {
      return;
    }
    this.rowFields.update((fields) => [...fields, columnId]);
  }

  public removeRowField(columnId: string): void {
    this.rowFields.update((fields) => fields.filter((id) => id !== columnId));
    this.setFieldGrouping(columnId, null);
  }

  public addColumnField(columnId: string): void {
    if (this.rowFields().includes(columnId) || this.columnFields().includes(columnId)) {
      return;
    }
    this.columnFields.update((fields) => [...fields, columnId]);
  }

  public removeColumnField(columnId: string): void {
    this.columnFields.update((fields) => fields.filter((id) => id !== columnId));
    this.setFieldGrouping(columnId, null);
  }

  public moveColumnField(index: number, offset: number): void {
    const fields = [...this.columnFields()];
    const target = index + offset;
    if (target < 0 || target >= fields.length) {
      return;
    }
    [fields[index], fields[target]] = [fields[target], fields[index]];
    this.columnFields.set(fields);
  }

  /** Null when the field groups by exact value. */
  public fieldGrouping(columnId: string): DateGrouping | null {
    return this.fieldGroupings().find((g) => g.columnId === columnId)?.grouping ?? null;
  }

  public setFieldGrouping(columnId: string, grouping: DateGrouping | null): void {
    const others = this.fieldGroupings().filter((g) => g.columnId !== columnId);
    if (!grouping && others.length === this.fieldGroupings().length) {
      return;
    }
    this.fieldGroupings.set(grouping ? [...others, { columnId, grouping }] : others);
  }

  public moveRowField(index: number, offset: number): void {
    const fields = [...this.rowFields()];
    const target = index + offset;
    if (target < 0 || target >= fields.length) {
      return;
    }
    [fields[index], fields[target]] = [fields[target], fields[index]];
    this.rowFields.set(fields);
  }

  /** Defaults to Count so it's valid before a column is picked. */
  public addMeasure(): void {
    const measure: PivotMeasure = {
      id: crypto.randomUUID(),
      columnId: null,
      aggregate: 'count',
      label: '',
    };
    this.measures.update((measures) => [...measures, measure]);
  }

  public updateMeasure(id: string, patch: Partial<Omit<PivotMeasure, 'id'>>): void {
    this.measures.update((measures) => measures.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  /**
   * Count drops the column. Distinct count reads any column, so moving from it to a numeric
   * aggregate drops a non-number column.
   */
  public setMeasureAggregate(id: string, aggregate: PivotAggregate): void {
    if (aggregate === 'count') {
      this.updateMeasure(id, { aggregate, columnId: null });
      return;
    }
    const measure = this.measures().find((m) => m.id === id);
    const column = measure?.columnId ? this.columns().find((c) => c.id === measure.columnId) : null;
    const keepsColumn =
      aggregate === 'countDistinct' || !column || ColumnTypes.isNumeric(column.type);
    this.updateMeasure(id, keepsColumn ? { aggregate } : { aggregate, columnId: null });
  }

  public removeMeasure(id: string): void {
    this.measures.update((measures) => measures.filter((m) => m.id !== id));
    // Clear the sort so the panel and query agree there's no measure sort.
    if (this.sortMeasureId() === id) {
      this.sortMeasureId.set(null);
    }
  }

  public moveMeasure(index: number, offset: number): void {
    const measures = [...this.measures()];
    const target = index + offset;
    if (target < 0 || target >= measures.length) {
      return;
    }
    [measures[index], measures[target]] = [measures[target], measures[index]];
    this.measures.set(measures);
  }

  public override toDto(): PivotTableWidget {
    const config: PivotTableWidgetConfig = {
      type: 'pivotTable',
      ...WidgetConfigDefaults.PIVOT_TABLE,
      ...this.baseConfigDto(),
      datasetId: this.datasetId(),
      rowFields: [...this.rowFields()],
      columnFields: [...this.columnFields()],
      fieldGroupings: this.fieldGroupings().map((g) => ({ ...g })),
      measures: this.measures().map((m) => ({ ...m })),
      sortMeasureId: this.sortMeasureId(),
      sortDescending: this.sortDescending(),
      showGrandTotal: this.showGrandTotal(),
      showSubtotals: this.showSubtotals(),
      filter: this.filter.toDto(),
    };
    return { ...this.geometryDto(), type: 'pivotTable', config };
  }

  public override defaultTitle(): string {
    return 'Pivot table';
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.filter];
  }

  public override ownIssues(): ValidationIssue[] {
    if (!this.datasetId()) {
      return [
        this.issue(
          'noDataset',
          'warning',
          `${this.label()} has no dataset`,
          'Pick a dataset so the pivot has something to summarise.',
        ),
      ];
    }
    return [
      this.noMeasuresIssue(),
      this.measureColumnIssue(),
      this.removedFieldIssue(),
      this.removedMeasureColumnIssue(),
    ].filter((issue): issue is ValidationIssue => !!issue);
  }

  private noMeasuresIssue(): ValidationIssue | null {
    if (this.measures().length > 0) {
      return null;
    }
    return this.issue(
      'noMeasures',
      'warning',
      `${this.label()} has no measures`,
      'Add at least one measure (a value column and how to summarise it).',
    );
  }

  private measureColumnIssue(): ValidationIssue | null {
    if (!this.measures().some((m) => m.aggregate !== 'count' && !m.columnId)) {
      return null;
    }
    return this.issue(
      'measureNoColumn',
      'warning',
      `${this.label()} has a measure with no column`,
      'Pick a value column for each measure other than Count.',
    );
  }

  private removedFieldIssue(): ValidationIssue | null {
    const columnIds = this.schemaColumnIds();
    const fields = [...this.rowFields(), ...this.columnFields()];
    if (!columnIds || fields.every((id) => columnIds.has(id))) {
      return null;
    }
    return this.issue(
      'missingRowField',
      'error',
      `${this.label()} groups by a column that no longer exists`,
      'A dimension column was removed from the dataset. Remove it or replace it with another.',
    );
  }

  private removedMeasureColumnIssue(): ValidationIssue | null {
    const columnIds = this.schemaColumnIds();
    if (!columnIds || !this.measures().some((m) => m.columnId && !columnIds.has(m.columnId))) {
      return null;
    }
    return this.issue(
      'missingMeasureColumn',
      'error',
      `${this.label()} has a measure whose column no longer exists`,
      "A measure's value column was removed from the dataset. Pick a new one.",
    );
  }

  private schemaColumnIds(): ReadonlySet<string> | null {
    const schema = this.schema();
    return schema ? new Set(schema.columns.map((c) => c.id)) : null;
  }
}

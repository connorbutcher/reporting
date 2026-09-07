import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  Aggregate,
  DEFAULT_PIVOT_CONFIG,
  PivotMeasure,
  PivotTableWidget,
  PivotTableWidgetConfig,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter.model';
import { ModelSources, WidgetModel } from './widget-model-base';
import { ValidationIssue } from './validation-issue';

/** Numeric column types an aggregate other than Count can reduce. */
function isNumeric(type: DatasetColumn['type']): boolean {
  return type === 'int' || type === 'double';
}

/**
 * A pivot / aggregation table. It binds a single dataset (like the data table), grouping rows by its
 * `rowFields` dimension columns and reducing each group to one or more `measures`. The measure list
 * and row-field list are edited as plain arrays; the widget's dirty/undo tracking flows through
 * {@link toDto}.
 */
export class PivotTableWidgetModel extends WidgetModel {
  public override readonly type = 'pivotTable' as const;

  /** Null until the user binds the pivot to a dataset. */
  public readonly datasetId = signal<number | null>(null);
  /** Column ids rows are grouped by, in order. */
  public readonly rowFields = signal<readonly string[]>([]);
  /** The measures computed per group, each a value column. */
  public readonly measures = signal<readonly PivotMeasure[]>([]);
  /** The measure the rows are ordered by (by its id); null orders by the dimensions. */
  public readonly sortMeasureId = signal<string | null>(null);
  public readonly sortDescending = signal(true);
  public readonly showGrandTotal = signal(true);

  /** Rows this widget aggregates, narrowed server-side. */
  public readonly filter: FilterGroupModel;

  /** The bound dataset's schema, once loaded. */
  public readonly schema: Signal<DatasetSchema | null>;
  /** Every column on the bound dataset. */
  public readonly columns: Signal<DatasetColumn[]>;
  /** Numeric columns, for the measure column picker (Count aside). */
  public readonly numericColumns: Signal<DatasetColumn[]>;
  /** Columns not already used as a row field, for the add-dimension picker. */
  public readonly availableRowFields: Signal<DatasetColumn[]>;

  constructor(widget: PivotTableWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;

    this.datasetId.set(config.datasetId);
    this.rowFields.set([...config.rowFields]);
    this.measures.set(config.measures.map((m) => ({ ...m })));
    this.sortMeasureId.set(config.sortMeasureId ?? null);
    this.sortDescending.set(config.sortDescending ?? true);
    this.showGrandTotal.set(config.showGrandTotal);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });
    this.columns = computed(() => this.schema()?.columns ?? []);
    this.numericColumns = computed(() => this.columns().filter((c) => isNumeric(c.type)));
    this.availableRowFields = computed(() => {
      const used = new Set(this.rowFields());
      return this.columns().filter((c) => !used.has(c.id));
    });

    this.filter = new FilterGroupModel(config.filter ?? null, {
      schema: this.schema,
      catalogue: sources.catalogue,
      // A pivot can filter on any of its dataset's columns, not only the ones it groups by.
      columns: this.columns,
      view: { kind: 'widgetFilters', widgetId: this.id },
      ownerId: this.id,
      widgetId: this.id,
    });
  }

  /** Swapping dataset invalidates every column choice and the filter. */
  public setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) return;
    this.datasetId.set(datasetId);
    this.rowFields.set([]);
    this.measures.set([]);
    this.sortMeasureId.set(null);
    this.filter.clear();
  }

  public addRowField(columnId: string): void {
    if (this.rowFields().includes(columnId)) return;
    this.rowFields.update((fields) => [...fields, columnId]);
  }

  public removeRowField(columnId: string): void {
    this.rowFields.update((fields) => fields.filter((id) => id !== columnId));
  }

  public moveRowField(index: number, offset: number): void {
    const fields = [...this.rowFields()];
    const target = index + offset;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    this.rowFields.set(fields);
  }

  /** Adds a measure, defaulting to Count so it's valid before a column is picked. */
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
    this.measures.update((measures) =>
      measures.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }

  /** Switching an aggregate to Count drops its column; away from Count leaves the picker to fill. */
  public setMeasureAggregate(id: string, aggregate: Aggregate): void {
    this.updateMeasure(id, aggregate === 'count' ? { aggregate, columnId: null } : { aggregate });
  }

  public removeMeasure(id: string): void {
    this.measures.update((measures) => measures.filter((m) => m.id !== id));
    // Sorting by a measure that's gone would silently fall back to dimension order; clear it so the
    // panel and the query agree there's no measure sort any more.
    if (this.sortMeasureId() === id) this.sortMeasureId.set(null);
  }

  public moveMeasure(index: number, offset: number): void {
    const measures = [...this.measures()];
    const target = index + offset;
    if (target < 0 || target >= measures.length) return;
    [measures[index], measures[target]] = [measures[target], measures[index]];
    this.measures.set(measures);
  }

  public override toDto(): PivotTableWidget {
    const config: PivotTableWidgetConfig = {
      type: 'pivotTable',
      ...DEFAULT_PIVOT_CONFIG,
      ...this.baseConfigDto(),
      datasetId: this.datasetId(),
      rowFields: [...this.rowFields()],
      measures: this.measures().map((m) => ({ ...m })),
      sortMeasureId: this.sortMeasureId(),
      sortDescending: this.sortDescending(),
      showGrandTotal: this.showGrandTotal(),
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
    const issues: ValidationIssue[] = [];
    const name = this.label();
    const view = { kind: 'widget', widgetId: this.id } as const;

    if (!this.datasetId()) {
      issues.push({
        id: `${this.id}:noDataset`,
        severity: 'warning',
        title: `${name} has no dataset`,
        detail: 'Pick a dataset so the pivot has something to summarise.',
        widgetId: this.id,
        view,
      });
      return issues;
    }

    if (this.measures().length === 0) {
      issues.push({
        id: `${this.id}:noMeasures`,
        severity: 'warning',
        title: `${name} has no measures`,
        detail: 'Add at least one measure (a value column and how to summarise it).',
        widgetId: this.id,
        view,
      });
    }

    // A non-count aggregate needs a column to reduce; Count is valid without one.
    if (this.measures().some((m) => m.aggregate !== 'count' && !m.columnId)) {
      issues.push({
        id: `${this.id}:measureNoColumn`,
        severity: 'warning',
        title: `${name} has a measure with no column`,
        detail: 'Pick a value column for each sum, average, min, or max measure.',
        widgetId: this.id,
        view,
      });
    }

    return issues;
  }
}

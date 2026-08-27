import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  FilterCondition,
  FilterGroup,
  FilterJoin,
  FilterNode,
  FilterOperator,
  OperatorCatalogue,
  OperatorDescriptor,
  ReportFilter,
  TOLERANCE_OPERATORS,
} from '../../../core/models/filter';
import { EditorNode } from './editor-node';
import { PanelView } from '../side-panel/panel-view';
import { ValidationIssue } from './validation-issue';

/** Everything a filter node needs to describe itself and validate against. */
export interface FilterContext {
  /** The dataset being filtered, once its schema has loaded. */
  readonly schema: Signal<DatasetSchema | null>;
  /** Operators per column type, once fetched. */
  readonly catalogue: Signal<OperatorCatalogue | null>;
  /**
   * The columns this filter may test, when narrower than the whole dataset —
   * a table's filter offers only the columns that table shows. Omitted for
   * page-level filters, which scope the dataset and so span every column.
   */
  readonly columns?: Signal<DatasetColumn[]>;
  /**
   * The columns (by id) that have tolerance banding in this filter's context, so the
   * tolerance operators can be offered only where there are bounds to test against.
   * A table contributes its banded columns; a chart binding its axis columns that have
   * a single band; a page filter the union across the report's widgets on that dataset.
   */
  readonly tolerantColumns?: Signal<ReadonlySet<string>>;
  /**
   * Where the builder's panel should take the user to fix a problem with this
   * filter. Omitted in the report viewer, which has no panel to navigate.
   */
  readonly view?: PanelView;
  /** Namespaces issue ids, and ties widget-level issues to their widget. */
  readonly ownerId: string;
  readonly widgetId?: string;
}

/** One `column operator value(s)` test. */
export class FilterConditionModel extends EditorNode {
  readonly columnId = signal<string>('');
  readonly operator = signal<FilterOperator>('equals');
  readonly values = signal<readonly string[]>([]);
  /** When off, the condition is kept but doesn't narrow the data — a viewer can toggle it. */
  readonly enabled = signal<boolean>(true);

  /** The dataset column this tests, once the schema has loaded. */
  readonly schemaColumn: Signal<DatasetColumn | null>;
  /** Operators offerable for that column's type. */
  readonly availableOperators: Signal<OperatorDescriptor[]>;
  /** The chosen operator's descriptor, which drives how many inputs to render. */
  readonly descriptor: Signal<OperatorDescriptor | null>;
  /** Whether this condition's column currently has tolerance banding in this context. */
  readonly isTolerant: Signal<boolean>;

  constructor(
    dto: FilterCondition,
    private readonly context: FilterContext,
  ) {
    super();
    this.columnId.set(dto.columnId);
    this.operator.set(dto.operator);
    this.values.set([...dto.values]);
    this.enabled.set(dto.enabled !== false);

    this.schemaColumn = computed(
      () => this.context.schema()?.columns.find((c) => c.id === this.columnId()) ?? null,
    );

    this.isTolerant = computed(
      () => this.context.tolerantColumns?.().has(this.columnId()) ?? false,
    );

    this.availableOperators = computed(() => {
      const type = this.schemaColumn()?.type;
      const catalogue = this.context.catalogue();
      if (!type || !catalogue) return [];

      const all = catalogue[type] ?? [];
      // Tolerance operators are offerable only on a column that actually has banding
      // here — elsewhere there are no bounds to test against, so they'd silently no-op.
      if (this.isTolerant()) return all;

      // Not banded here: hide the tolerance operators, but keep whichever one is
      // already selected, so an orphaned condition (its banding was removed) still
      // shows what it was set to rather than a blank select — its warning explains it.
      const current = this.operator();
      return all.filter((o) => !TOLERANCE_OPERATORS.has(o.value) || o.value === current);
    });

    this.descriptor = computed(
      () => this.availableOperators().find((o) => o.value === this.operator()) ?? null,
    );
  }

  /** Switching column can invalidate the operator, so fall back to the first valid one. */
  setColumn(columnId: string): void {
    if (columnId === this.columnId()) return;
    this.columnId.set(columnId);

    const operators = this.availableOperators();
    if (!operators.some((o) => o.value === this.operator())) {
      this.operator.set(operators[0]?.value ?? 'equals');
    }
    this.values.set([]);
  }

  setOperator(operator: FilterOperator): void {
    if (operator === this.operator()) return;
    this.operator.set(operator);

    // Keep whatever operands still fit the new operator's arity.
    const needed = this.availableOperators().find((o) => o.value === operator)?.operandCount ?? 0;
    this.values.update((values) => values.slice(0, needed));
  }

  setEnabled(enabled: boolean): void {
    this.enabled.set(enabled);
  }

  setValue(index: number, value: string): void {
    this.values.update((values) => {
      const next = [...values];
      while (next.length <= index) next.push('');
      next[index] = value;
      return next;
    });
  }

  /** The operand slots to render — empty when the operator takes none. */
  readonly operandIndexes = computed(() =>
    Array.from({ length: this.descriptor()?.operandCount ?? 0 }, (_, i) => i),
  );

  /** True once every operand the operator needs has been supplied. */
  readonly isComplete = computed(() => {
    const needed = this.descriptor()?.operandCount ?? 0;
    return this.values().filter((v) => v.trim().length > 0).length >= needed;
  });

  readonly label = computed(() => {
    const column = this.schemaColumn()?.name ?? 'Unknown column';
    const operator = this.descriptor()?.label ?? this.operator();
    const values = this.values()
      .filter((v) => v.trim().length > 0)
      .join(' and ');
    return `${column} ${operator}${values ? ` ${values}` : ''}`;
  });

  toDto(): FilterCondition {
    return {
      kind: 'condition',
      columnId: this.columnId(),
      operator: this.operator(),
      values: [...this.values()],
      // Omitted when enabled, so the common case stays as it was before toggling
      // existed — and keeps the DTO (and its filterKey) stable for unchanged filters.
      ...(this.enabled() ? {} : { enabled: false }),
    };
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return [];
  }

  protected override ownIssues(): ValidationIssue[] {
    // A disabled condition never runs, so an incomplete or stale one isn't a problem
    // to fix — leave it inert rather than flagging it.
    if (!this.enabled()) return [];

    const issues: ValidationIssue[] = [];
    const id = `${this.context.ownerId}:filter:${this.columnId()}:${this.operator()}`;

    // A pending schema fetch must not look like a deleted column.
    if (this.context.schema() && !this.schemaColumn()) {
      issues.push({
        id: `${id}:missingColumn`,
        severity: 'error',
        title: 'A filter points at a column that no longer exists',
        detail: 'The dataset column was removed. Remove or repoint that filter condition.',
        widgetId: this.context.widgetId,
        view: this.context.view ?? { kind: 'root' },
      });
      return issues;
    }

    // A tolerance operator resolves its bounds from the column's banding. If that banding
    // has since been removed, the condition silently matches nothing — flag it so the
    // author can add the banding back or change the condition.
    if (TOLERANCE_OPERATORS.has(this.operator()) && !this.isTolerant()) {
      issues.push({
        id: `${id}:missingTolerance`,
        severity: 'warning',
        title: `Tolerance filter on "${this.schemaColumn()?.name ?? 'a column'}" has no banding`,
        detail:
          'This column no longer has tolerance banding, so the filter matches nothing. ' +
          'Add banding back to the column, or change this condition.',
        widgetId: this.context.widgetId,
        view: this.context.view ?? { kind: 'root' },
      });
      return issues;
    }

    const needed = this.descriptor()?.operandCount ?? 0;
    if (!this.isComplete()) {
      issues.push({
        id: `${id}:missingValue`,
        severity: 'error',
        title: `Filter on "${this.schemaColumn()?.name ?? 'a column'}" is missing a value`,
        detail: `"${this.descriptor()?.label ?? this.operator()}" needs ${needed} value${needed > 1 ? 's' : ''}.`,
        widgetId: this.context.widgetId,
        view: this.context.view ?? { kind: 'root' },
      });
    }

    return issues;
  }
}

/** A set of conditions joined by AND or OR. */
export class FilterGroupModel extends EditorNode {
  readonly join = signal<FilterJoin>('and');
  readonly children = signal<readonly FilterConditionModel[]>([]);

  readonly isEmpty = computed(() => this.children().length === 0);
  readonly count = computed(() => this.children().length);
  /** How many conditions are switched on — what actually narrows the data. */
  readonly enabledCount = computed(() => this.children().filter((c) => c.enabled()).length);

  /** Columns offerable in the picker, once the dataset's schema has loaded. */
  readonly columns: Signal<DatasetColumn[]>;
  /** False until both the schema and the operator catalogue are in. */
  readonly ready: Signal<boolean>;

  constructor(
    dto: FilterGroup | null,
    private readonly context: FilterContext,
  ) {
    super();
    this.columns = computed(() => {
      const all = context.schema()?.columns ?? [];
      const allowed = context.columns?.();
      if (!allowed) return all;

      // A condition may already reference a column since taken off the table.
      // Keep it listed so its select still shows what it's testing, rather than
      // rendering blank and looking broken.
      const referenced = new Set(this.children().map((c) => c.columnId()));
      const allowedIds = new Set(allowed.map((c) => c.id));
      return all.filter((c) => allowedIds.has(c.id) || referenced.has(c.id));
    });
    this.ready = computed(() => !!context.schema() && !!context.catalogue());
    this.join.set(dto?.join ?? 'and');
    this.children.set(
      (dto?.children ?? [])
        // The UI offers one level of grouping, so nested groups are flattened on
        // load rather than silently dropped. The contract still allows nesting.
        .flatMap((child) => (child.kind === 'condition' ? [child] : flattenConditions(child)))
        .map((condition) => new FilterConditionModel(condition, context)),
    );
  }

  setJoin(join: FilterJoin): void {
    this.join.set(join);
  }

  /** Adds a condition on the first column this filter is allowed to test. */
  addCondition(columnId?: string): FilterConditionModel | null {
    const offerable = this.columns();
    const column = columnId ? offerable.find((c) => c.id === columnId) : offerable[0];
    if (!column) return null;

    const catalogue = this.context.catalogue();
    const operator = catalogue?.[column.type]?.[0]?.value ?? 'equals';

    const model = new FilterConditionModel(
      { kind: 'condition', columnId: column.id, operator, values: [] },
      this.context,
    );
    this.children.update((children) => [...children, model]);
    return model;
  }

  removeAt(index: number): void {
    this.children.update((children) => children.filter((_, i) => i !== index));
  }

  clear(): void {
    this.children.set([]);
  }

  /** Discards the current conditions and rebuilds from a stored filter. */
  replaceWith(dto: FilterGroup | null): void {
    this.join.set(dto?.join ?? 'and');
    this.children.set(
      (dto?.children ?? [])
        .flatMap((child) => (child.kind === 'condition' ? [child] : flattenConditions(child)))
        .map((condition) => new FilterConditionModel(structuredClone(condition), this.context)),
    );
  }

  /** Null when nothing is set, so an untouched filter never narrows anything. */
  toDto(): FilterGroup | null {
    const children = this.children().map((c) => c.toDto());
    return children.length === 0 ? null : { kind: 'group', join: this.join(), children };
  }

  /**
   * The filter as sent to the query endpoint. A condition the user has added but
   * not finished typing a value for is left out — the server rightly rejects an
   * operand-less condition, and a half-built row shouldn't blank the table. It
   * still round-trips through {@link toDto} so the edit isn't lost, and its
   * validation error keeps it from ever being saved. A disabled condition is left
   * out the same way, so toggling one off narrows nothing until it's switched back on.
   */
  toQueryDto(): FilterGroup | null {
    const children = this.children()
      .filter((c) => c.enabled() && c.isComplete())
      .map((c) => c.toDto());
    return children.length === 0 ? null : { kind: 'group', join: this.join(), children };
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return this.children();
  }

  protected override ownIssues(): ValidationIssue[] {
    return [];
  }
}

/**
 * A report-level filter for one dataset. It applies to every data-table widget
 * bound to that dataset, on top of whatever filter the widget sets itself.
 */
export class ReportFilterModel extends EditorNode {
  readonly datasetId: number;
  readonly group: FilterGroupModel;
  readonly datasetName: Signal<string>;

  constructor(datasetId: number, dto: FilterGroup | null, context: FilterContext) {
    super();
    this.datasetId = datasetId;
    this.group = new FilterGroupModel(dto, context);
    this.datasetName = computed(() => context.schema()?.name ?? 'Unknown dataset');
  }

  toDto(): ReportFilter | null {
    const filter = this.group.toDto();
    return filter ? { datasetId: this.datasetId, filter } : null;
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return [this.group];
  }

  protected override ownIssues(): ValidationIssue[] {
    return [];
  }
}

/** Pulls every condition out of a nested group, in order. */
function flattenConditions(node: FilterNode): FilterCondition[] {
  return node.kind === 'condition' ? [node] : node.children.flatMap(flattenConditions);
}

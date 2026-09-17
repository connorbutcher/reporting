import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn } from '../../../../core/models/dataset';
import { FilterCondition, FilterGroup, FilterJoin, FilterNode } from '../../../../core/models/filter';
import { EditorNode } from '../editor-node';
import { ValidationIssue } from '../validation-issue';
import { FilterConditionModel } from './filter-condition.model';
import { FilterContext } from './filter-context';

/** A set of conditions joined by AND or OR. */
export class FilterGroupModel extends EditorNode {
  public readonly join = signal<FilterJoin>('and');
  public readonly children = signal<readonly FilterConditionModel[]>([]);

  public readonly isEmpty = computed(() => this.children().length === 0);
  public readonly count = computed(() => this.children().length);
  /** How many conditions are switched on — what actually narrows the data. */
  public readonly enabledCount = computed(() => this.children().filter((c) => c.enabled()).length);

  /** Columns offerable in the picker, once the dataset's schema has loaded. */
  public readonly columns: Signal<DatasetColumn[]> = computed(() => {
    const all = this.context.schema()?.columns ?? [];
    const allowed = this.context.columns?.();
    if (!allowed) return all;

    // A condition may reference a column since taken off the table; keep it listed so
    // its select still shows what it's testing, rather than rendering blank.
    const referenced = new Set(this.children().map((c) => c.columnId()));
    const allowedIds = new Set(allowed.map((c) => c.id));
    return all.filter((c) => allowedIds.has(c.id) || referenced.has(c.id));
  });

  /** False until both the schema and the operator catalogue are in. */
  public readonly ready: Signal<boolean> = computed(
    () => !!this.context.schema() && !!this.context.catalogue(),
  );

  /** The dataset being filtered, for fetching a column's distinct values; null until the schema loads. */
  public readonly datasetId: Signal<number | null> = computed(() => this.context.schema()?.id ?? null);

  constructor(
    dto: FilterGroup | null,
    private readonly context: FilterContext,
  ) {
    super();
    this.join.set(dto?.join ?? 'and');
    this.children.set(toConditions(dto, context));
  }

  public setJoin(join: FilterJoin): void {
    this.join.set(join);
  }

  /** Adds a condition on the first column this filter is allowed to test. */
  public addCondition(columnId?: string): FilterConditionModel | null {
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

  public removeAt(index: number): void {
    this.children.update((children) => children.filter((_, i) => i !== index));
  }

  public clear(): void {
    this.children.set([]);
  }

  /** Discards the current conditions and rebuilds from a stored filter. */
  public replaceWith(dto: FilterGroup | null): void {
    this.join.set(dto?.join ?? 'and');
    this.children.set(toConditions(dto, this.context, { clone: true }));
  }

  /** Null when nothing is set, so an untouched filter never narrows anything. */
  public toDto(): FilterGroup | null {
    const children = this.children().map((c) => c.toDto());
    return children.length === 0 ? null : { kind: 'group', join: this.join(), children };
  }

  /**
   * The filter as sent to the query endpoint: only enabled, complete conditions — a
   * half-typed or disabled row is left out (the server rejects an operand-less
   * condition, and a half-built row shouldn't blank the table) but still round-trips
   * through {@link toDto}, so the edit isn't lost and its validation keeps it from saving.
   */
  public toQueryDto(): FilterGroup | null {
    const children = this.children()
      .filter((c) => c.enabled() && c.isComplete())
      .map((c) => c.toDto());
    return children.length === 0 ? null : { kind: 'group', join: this.join(), children };
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public override childNodes(): readonly EditorNode[] {
    return this.children();
  }

  public override ownIssues(): ValidationIssue[] {
    return [];
  }
}

/**
 * The UI offers one level of grouping, so a stored filter's nested groups are
 * flattened to their conditions on load rather than dropped. `clone` deep-copies
 * each condition first, for rebuilding from a filter also held elsewhere (e.g. the
 * published revision `replaceWith` restores from).
 */
function toConditions(
  dto: FilterGroup | null,
  context: FilterContext,
  options?: { clone?: boolean },
): FilterConditionModel[] {
  return (dto?.children ?? [])
    .flatMap((child) => (child.kind === 'condition' ? [child] : flattenConditions(child)))
    .map((c) => new FilterConditionModel(options?.clone ? structuredClone(c) : c, context));
}

function flattenConditions(node: FilterNode): FilterCondition[] {
  return node.kind === 'condition' ? [node] : node.children.flatMap(flattenConditions);
}

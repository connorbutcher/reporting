import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn } from '../../../../core/models/dataset';
import { FilterGroup, FilterJoin } from '../../../../core/models/filter';
import { EditorNode } from '../editor-node';
import { ValidationIssue } from '../validation-issue';
import { FilterConditionModel } from './filter-condition.model';
import { FilterContext } from './filter-context';
import { toConditionModels } from './filter-group-nodes';

/** A set of conditions joined by AND or OR. */
export class FilterGroupModel extends EditorNode {
  public readonly join = signal<FilterJoin>('and');
  public readonly children = signal<readonly FilterConditionModel[]>([]);

  public readonly count = computed(() => this.children().length);
  /** Conditions switched on: what actually narrows the data. */
  public readonly enabledCount = computed(() => this.children().filter((c) => c.enabled()).length);
  /** Switched-on conditions on a removed column, which {@link toQueryDto} leaves out. */
  public readonly missingColumnCount = computed(
    () => this.children().filter((c) => c.enabled() && c.columnMissing()).length,
  );

  /** The columns offerable in the picker; empty until the schema loads. */
  public readonly columns: Signal<DatasetColumn[]> = computed(() => {
    const all = this.context.schema()?.columns ?? [];
    const allowed = this.context.columns?.();
    if (!allowed) return all;

    // A condition may use a column since taken off the table; keep it listed so its select isn't blank.
    const referenced = new Set(this.children().map((c) => c.columnId()));
    const allowedIds = new Set(allowed.map((c) => c.id));
    return all.filter((c) => allowedIds.has(c.id) || referenced.has(c.id));
  });

  /** Both the schema and the operator catalogue are in. */
  public readonly ready: Signal<boolean> = computed(
    () => !!this.context.schema() && !!this.context.catalogue(),
  );

  /** Null until the schema loads. */
  public readonly datasetId: Signal<number | null> = computed(() => this.context.schema()?.id ?? null);

  constructor(
    dto: FilterGroup | null,
    private readonly context: FilterContext,
  ) {
    super();
    this.join.set(dto?.join ?? 'and');
    this.children.set(toConditionModels(dto, context));
  }

  public setJoin(join: FilterJoin): void {
    this.join.set(join);
  }

  /** Adds a condition on the first column this filter may test, or on `columnId`. Null if none is offerable. */
  public addCondition(columnId?: string): FilterConditionModel | null {
    const offerable = this.columns();
    const column = columnId ? offerable.find((c) => c.id === columnId) : offerable[0];
    if (!column) return null;

    const operator = this.context.catalogue()?.[column.type]?.[0]?.value ?? 'equals';
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

  /** Rebuilds from a stored filter, leaving that filter's own conditions untouched. */
  public replaceWith(dto: FilterGroup | null): void {
    this.join.set(dto?.join ?? 'and');
    this.children.set(toConditionModels(dto, this.context, { clone: true }));
  }

  /** Null when empty, so an untouched filter never narrows anything. */
  public toDto(): FilterGroup | null {
    return this.project(() => true);
  }

  /**
   * The filter sent to the query endpoint: enabled, complete conditions on columns that exist. The
   * server rejects an operand-less condition or an unknown column outright, failing the whole widget.
   */
  public toQueryDto(): FilterGroup | null {
    return this.project((c) => c.enabled() && c.isComplete() && !c.columnMissing());
  }

  /** Every finished condition, enabled or not: a disabled one can be toggled back on, but a row still being typed isn't state yet. */
  public toCompleteDto(): FilterGroup | null {
    return this.project((c) => c.isComplete());
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

  private project(keep: (condition: FilterConditionModel) => boolean): FilterGroup | null {
    const children = this.children().filter(keep).map((c) => c.toDto());
    return children.length === 0 ? null : { kind: 'group', join: this.join(), children };
  }
}

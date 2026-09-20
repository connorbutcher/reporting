import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn } from '../../../../core/models/dataset';
import {
  FilterCondition,
  FilterOperator,
  OperatorDescriptor,
  TOLERANCE_OPERATORS,
} from '../../../../core/models/filter';
import { EditorNode } from '../editor-node';
import { ValidationIssue } from '../validation-issue';
import { findProblem, problemCue, problemIssue } from './filter-condition-problem';
import { FilterContext } from './filter-context';
import { offerableOperators } from './offerable-operators';

/** One `column operator value(s)` test. */
export class FilterConditionModel extends EditorNode {
  public readonly columnId = signal<string>('');
  public readonly operator = signal<FilterOperator>('equals');
  public readonly values = signal<readonly string[]>([]);
  /** Off keeps the condition but doesn't apply it. */
  public readonly enabled = signal<boolean>(true);

  public readonly schemaColumn: Signal<DatasetColumn | null> = computed(
    () => this.context.schema()?.columns.find((c) => c.id === this.columnId()) ?? null,
  );

  /** The column has tolerance banding in this context. */
  public readonly isTolerant: Signal<boolean> = computed(
    () => this.context.tolerantColumns?.().has(this.columnId()) ?? false,
  );

  public readonly availableOperators: Signal<OperatorDescriptor[]> = computed(() => {
    const type = this.schemaColumn()?.type;
    const catalogue = this.context.catalogue();
    if (!type || !catalogue) return [];
    return offerableOperators(catalogue[type] ?? [], this.isTolerant(), this.operator());
  });

  /** Drives how many operand inputs to render. */
  public readonly descriptor: Signal<OperatorDescriptor | null> = computed(
    () => this.availableOperators().find((o) => o.value === this.operator()) ?? null,
  );

  public readonly operandIndexes = computed(() =>
    Array.from({ length: this.descriptor()?.operandCount ?? 0 }, (_, i) => i),
  );

  /** The schema has loaded and lacks this column. False while it's pending, so a slow fetch isn't read as a deleted column. */
  public readonly columnMissing = computed(() => !!this.context.schema() && !this.schemaColumn());

  /** Reads as complete while operators are unknown, so a pending schema drops nothing. */
  public readonly isComplete = computed(() => {
    const needed = this.descriptor()?.operandCount ?? 0;
    return this.values().filter((v) => v.trim().length > 0).length >= needed;
  });

  /** Why this row isn't narrowing the data; null when fine or disabled. */
  public readonly problem = computed(() => {
    const problem = this.currentProblem();
    return problem && problemCue(problem);
  });

  private readonly currentProblem = computed(() =>
    this.enabled()
      ? findProblem({
          columnMissing: this.columnMissing(),
          toleranceMissing: TOLERANCE_OPERATORS.has(this.operator()) && !this.isTolerant(),
          complete: this.isComplete(),
          columnName: this.schemaColumn()?.name ?? null,
          operatorLabel: this.descriptor()?.label ?? this.operator(),
          needed: this.descriptor()?.operandCount ?? 0,
        })
      : null,
  );

  constructor(
    dto: FilterCondition,
    private readonly context: FilterContext,
  ) {
    super();
    this.columnId.set(dto.columnId);
    this.operator.set(dto.operator);
    this.values.set([...dto.values]);
    this.enabled.set(dto.enabled !== false);
  }

  /** Switching column can invalidate the operator, so fall back to the first valid one. */
  public setColumn(columnId: string): void {
    if (columnId === this.columnId()) return;
    this.columnId.set(columnId);

    const operators = this.availableOperators();
    if (!operators.some((o) => o.value === this.operator())) {
      this.operator.set(operators[0]?.value ?? 'equals');
    }
    this.values.set([]);
  }

  public setOperator(operator: FilterOperator): void {
    if (operator === this.operator()) return;
    this.operator.set(operator);

    const needed = this.availableOperators().find((o) => o.value === operator)?.operandCount ?? 0;
    this.values.update((values) => values.slice(0, needed));
  }

  public setEnabled(enabled: boolean): void {
    this.enabled.set(enabled);
  }

  public setValue(index: number, value: string): void {
    this.values.update((values) => {
      const next = [...values];
      while (next.length <= index) next.push('');
      next[index] = value;
      return next;
    });
  }

  /** Replaces every operand at once, for the multi-select of "is any of". */
  public setValues(values: readonly string[]): void {
    this.values.set([...values]);
  }

  public toDto(): FilterCondition {
    return {
      kind: 'condition',
      columnId: this.columnId(),
      operator: this.operator(),
      values: [...this.values()],
      // Omitted when enabled, so the dto (and filterKey) is stable for the never-disabled case.
      ...(this.enabled() ? {} : { enabled: false }),
    };
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public override childNodes(): readonly EditorNode[] {
    return [];
  }

  public override ownIssues(): ValidationIssue[] {
    const problem = this.currentProblem();
    if (!problem) return [];
    return [problemIssue(problem, `${this.context.ownerId}:filter:${this.columnId()}:${this.operator()}`, this.context)];
  }
}

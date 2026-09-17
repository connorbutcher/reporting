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
import { FilterContext } from './filter-context';

/** One `column operator value(s)` test. */
export class FilterConditionModel extends EditorNode {
  public readonly columnId = signal<string>('');
  public readonly operator = signal<FilterOperator>('equals');
  public readonly values = signal<readonly string[]>([]);
  /** When off, the condition is kept but doesn't narrow the data — a viewer can toggle it. */
  public readonly enabled = signal<boolean>(true);

  /** The dataset column this tests, once the schema has loaded. */
  public readonly schemaColumn: Signal<DatasetColumn | null> = computed(
    () => this.context.schema()?.columns.find((c) => c.id === this.columnId()) ?? null,
  );

  /** Whether this condition's column currently has tolerance banding in this context. */
  public readonly isTolerant: Signal<boolean> = computed(
    () => this.context.tolerantColumns?.().has(this.columnId()) ?? false,
  );

  /** Operators offerable for that column's type. */
  public readonly availableOperators: Signal<OperatorDescriptor[]> = computed(() => {
    const type = this.schemaColumn()?.type;
    const catalogue = this.context.catalogue();
    if (!type || !catalogue) return [];

    const all = catalogue[type] ?? [];
    // Only offerable where there's a band to test against — elsewhere it'd silently no-op.
    if (this.isTolerant()) return all;

    // Keep the currently-selected operator even if it's now orphaned, so an
    // affected condition still shows what it was set to rather than going blank.
    const current = this.operator();
    return all.filter((o) => !TOLERANCE_OPERATORS.has(o.value) || o.value === current);
  });

  /** The chosen operator's descriptor, which drives how many inputs to render. */
  public readonly descriptor: Signal<OperatorDescriptor | null> = computed(
    () => this.availableOperators().find((o) => o.value === this.operator()) ?? null,
  );

  /** The operand slots to render — empty when the operator takes none. */
  public readonly operandIndexes = computed(() =>
    Array.from({ length: this.descriptor()?.operandCount ?? 0 }, (_, i) => i),
  );

  /** True once every operand the operator needs has been supplied. */
  public readonly isComplete = computed(() => {
    const needed = this.descriptor()?.operandCount ?? 0;
    return this.values().filter((v) => v.trim().length > 0).length >= needed;
  });

  /**
   * Why this row isn't narrowing the data, for its inline cue — null when fine or
   * disabled. Mirrors {@link ownIssues} so the cue and the Issues panel never disagree.
   */
  public readonly problem = computed<{ severity: 'error' | 'warning'; message: string } | null>(
    () => {
      if (!this.enabled()) return null;

      if (this.context.schema() && !this.schemaColumn()) {
        return { severity: 'error', message: 'This column no longer exists.' };
      }
      if (TOLERANCE_OPERATORS.has(this.operator()) && !this.isTolerant()) {
        return { severity: 'warning', message: 'No tolerance banding here, so nothing matches.' };
      }
      if (!this.isComplete()) {
        const needed = this.descriptor()?.operandCount ?? 0;
        return { severity: 'error', message: needed > 1 ? 'Enter both values.' : 'Enter a value.' };
      }
      return null;
    },
  );

  public readonly label = computed(() => {
    const column = this.schemaColumn()?.name ?? 'Unknown column';
    const operator = this.descriptor()?.label ?? this.operator();
    const values = this.values()
      .filter((v) => v.trim().length > 0)
      .join(' and ');
    return `${column} ${operator}${values ? ` ${values}` : ''}`;
  });

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

    // Keep whatever operands still fit the new operator's arity.
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

  /** Replaces every operand at once — used by the multi-select value picker for "is any of". */
  public setValues(values: readonly string[]): void {
    this.values.set([...values]);
  }

  public toDto(): FilterCondition {
    return {
      kind: 'condition',
      columnId: this.columnId(),
      operator: this.operator(),
      values: [...this.values()],
      // Omitted when enabled, so a filter's DTO (and filterKey) stays stable pre- and
      // post-toggling support for the common, never-disabled case.
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
    // A disabled condition never runs, so an incomplete or stale one isn't a problem to fix.
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

    // A tolerance operator resolves its bounds from the column's banding; if that's
    // since been removed, the condition silently matches nothing.
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

import {
  Component,
  DestroyRef,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterOperator } from '../../../../core/models/filter';
import { FilterConditionModel, FilterGroupModel } from '../../models/filter.model';

/** The string operators whose operand is one of the column's values — offered as a value picker. */
const VALUE_LIST_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'equals',
  'notEquals',
  'in',
]);

/**
 * Edits one group of filter conditions. Used for both a widget's own filter and
 * a report-level one — the group model it's handed decides which.
 *
 * The operator list for each row comes from the server's catalogue via the
 * condition model, so the panel can only ever offer what the server accepts.
 */
@Component({
  selector: 'app-filter-builder',
  imports: [FormsModule, ButtonModule, MultiSelectModule, SelectModule, ToggleSwitchModule],
  templateUrl: './filter-builder.component.html',
  styleUrl: './filter-builder.component.scss',
})
export class FilterBuilderComponent {
  readonly group = input.required<FilterGroupModel>();
  /** Shown above the rows; explains what this particular filter scopes. */
  readonly hint = input<string>('');

  private readonly api = inject(DatasetApiService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * A column's distinct values, fetched once and cached by column id. Populated lazily by the
   * effect below as conditions come to need a value picker, so a filter with no value-list
   * condition fetches nothing.
   */
  private readonly valueLists = new Map<string, WritableSignal<string[]>>();

  constructor() {
    // Load the distinct values for every column a condition currently wants to pick from. Reading
    // the conditions (and each one's column and operator) inside the effect re-runs it whenever a
    // row switches to a value-list operator or column, fetching that column's values on demand.
    effect(() => {
      const datasetId = this.group().datasetId();
      if (datasetId === null) return;

      for (const condition of this.group().children()) {
        if (!this.usesValueList(condition)) continue;

        const columnId = condition.columnId();
        if (this.valueLists.has(columnId)) continue;

        const values = signal<string[]>([]);
        this.valueLists.set(columnId, values);
        this.api
          .columnValues(datasetId, columnId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((v) => values.set(v));
      }
    });
  }

  protected readonly joinOptions = [
    { label: 'Match all', value: 'and' as const },
    { label: 'Match any', value: 'or' as const },
  ];

  protected readonly columnOptions = computed(() =>
    this.group()
      .columns()
      .map((c) => ({ label: c.name, value: c.id })),
  );

  /** True when the operand should be picked from the column's values rather than typed. */
  protected usesValueList(condition: FilterConditionModel): boolean {
    return (
      condition.schemaColumn()?.type === 'string' &&
      VALUE_LIST_OPERATORS.has(condition.operator())
    );
  }

  /** "is any of" takes several values at once, so it renders a multi-select rather than a select. */
  protected isMultiValue(condition: FilterConditionModel): boolean {
    return condition.operator() === 'in';
  }

  /** The distinct values offered for a condition's column, empty until they've loaded. */
  protected valueOptions(condition: FilterConditionModel): string[] {
    return this.valueLists.get(condition.columnId())?.() ?? [];
  }

  protected addCondition(): void {
    this.group().addCondition();
  }

  protected remove(index: number): void {
    this.group().removeAt(index);
  }

  /** The native input type that best matches an operand's kind. */
  protected inputType(condition: FilterConditionModel): string {
    switch (condition.descriptor()?.operandKind) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  }

  protected placeholder(condition: FilterConditionModel, index: number): string {
    if (condition.descriptor()?.operandKind === 'list') return 'value, value, …';
    if (condition.descriptor()?.operandCount === 2) return index === 0 ? 'from' : 'to';
    return 'value';
  }

  /** Dates round-trip as ISO strings but a date input wants yyyy-MM-dd. */
  protected operandValue(condition: FilterConditionModel, index: number): string {
    const raw = condition.values()[index] ?? '';
    if (condition.descriptor()?.operandKind !== 'date' || !raw) return raw;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
  }
}

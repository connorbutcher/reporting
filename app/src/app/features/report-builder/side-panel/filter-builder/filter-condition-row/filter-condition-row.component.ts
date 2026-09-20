import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FilterConditionModel } from '../../../models/filter';
import { ColumnValueLists } from '../column-value-lists';
import {
  operandDisplayValue,
  operandInputType,
  operandPlaceholder,
  usesValueList,
} from '../operand-input';

/** One condition: enable toggle, column, operator and operands, with the reason it isn't narrowing when it isn't. */
@Component({
  selector: 'app-filter-condition-row',
  imports: [FormsModule, ButtonModule, MultiSelectModule, SelectModule, ToggleSwitchModule],
  templateUrl: './filter-condition-row.component.html',
  styleUrl: './filter-condition-row.component.scss',
  host: {
    role: 'listitem',
    class: 'filter-row',
    '[class.filter-row--off]': '!condition().enabled()',
    '[class.filter-row--error]': "condition().problem()?.severity === 'error'",
    '[class.filter-row--warning]': "condition().problem()?.severity === 'warning'",
  },
})
export class FilterConditionRowComponent {
  public readonly condition = input.required<FilterConditionModel>();
  /** Zero-based position, shown one-based. */
  public readonly index = input.required<number>();
  public readonly columnOptions = input.required<{ label: string; value: string }[]>();
  public readonly datasetId = input.required<number | null>();
  public readonly remove = output<void>();

  public readonly position = computed(() => this.index() + 1);

  public readonly pickFromValues = computed(() =>
    usesValueList(this.condition().schemaColumn()?.type, this.condition().operator()),
  );

  /** "Is any of" takes several values, so it's a multi-select. */
  public readonly isMultiValue = computed(() => this.condition().operator() === 'in');

  public readonly valueOptions = computed(() =>
    this.pickFromValues() ? this.lists.valuesFor(this.condition().columnId())() : [],
  );

  public readonly inputType = computed(() => operandInputType(this.condition().descriptor()));

  public readonly operands = computed(() => {
    const condition = this.condition();
    const descriptor = condition.descriptor();
    return condition.operandIndexes().map((index) => ({
      index,
      placeholder: operandPlaceholder(descriptor, index),
      value: operandDisplayValue(descriptor, condition.values()[index] ?? ''),
    }));
  });

  private readonly lists = inject(ColumnValueLists);

  constructor() {
    // Fetches on demand as the row comes to need a value picker, so a filter without one fetches nothing.
    effect(() => {
      const datasetId = this.datasetId();
      if (datasetId !== null && this.pickFromValues()) this.lists.load(datasetId, this.condition().columnId());
    });
  }
}

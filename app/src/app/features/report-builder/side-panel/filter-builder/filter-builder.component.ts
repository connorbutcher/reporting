import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FilterConditionModel, FilterGroupModel } from '../../models/filter.model';

/**
 * Edits one group of filter conditions. Used for both a widget's own filter and
 * a report-level one — the group model it's handed decides which.
 *
 * The operator list for each row comes from the server's catalogue via the
 * condition model, so the panel can only ever offer what the server accepts.
 */
@Component({
  selector: 'app-filter-builder',
  imports: [FormsModule, ButtonModule, SelectModule],
  templateUrl: './filter-builder.component.html',
  styleUrl: './filter-builder.component.scss',
})
export class FilterBuilderComponent {
  readonly group = input.required<FilterGroupModel>();
  /** Shown above the rows; explains what this particular filter scopes. */
  readonly hint = input<string>('');

  protected readonly joinOptions = [
    { label: 'Match all', value: 'and' as const },
    { label: 'Match any', value: 'or' as const },
  ];

  protected readonly columnOptions = computed(() =>
    this.group().columns().map((c) => ({ label: c.name, value: c.id })),
  );

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

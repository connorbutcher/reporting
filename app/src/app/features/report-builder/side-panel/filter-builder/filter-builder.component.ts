import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FilterGroup } from '../../../../core/models/filter';
import { FilterGroupModel } from '../../models/filter';
import { ColumnValueLists } from './column-value-lists';
import { FilterConditionRowComponent } from './filter-condition-row/filter-condition-row.component';
import { FilterMatchCountComponent } from './filter-match-count/filter-match-count.component';

/**
 * Edits one group of filter conditions: a widget's own filter or a report-level one, whichever
 * group model it's handed. Operators come from the server's catalogue, so it only offers what the server accepts.
 */
@Component({
  selector: 'app-filter-builder',
  imports: [FormsModule, ButtonModule, SelectModule, FilterMatchCountComponent, FilterConditionRowComponent],
  providers: [ColumnValueLists],
  templateUrl: './filter-builder.component.html',
  styleUrl: './filter-builder.component.scss',
})
export class FilterBuilderComponent {
  public readonly group = input.required<FilterGroupModel>();
  /** Explains what this filter scopes. */
  public readonly hint = input<string>('');
  /** Whatever else already narrows this dataset (see {@link FilterMatchCountComponent.additionalFilter}). */
  public readonly additionalFilter = input<FilterGroup | null>(null);

  public readonly joinOptions = [
    { label: 'Match all', value: 'and' as const },
    { label: 'Match any', value: 'or' as const },
  ];

  public readonly columnOptions = computed(() =>
    this.group()
      .columns()
      .map((c) => ({ label: c.name, value: c.id })),
  );

  public addCondition(): void {
    this.group().addCondition();
  }

  public remove(index: number): void {
    this.group().removeAt(index);
  }
}

import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatasetColumn } from '../../../../../core/models/dataset';
import {
  ChartSort,
  ChartSortBy,
  DEFAULT_CHART_SORT,
  SortAggregate,
} from '../../../../../core/models/report';

/**
 * A chart's order control, shared by every chart kind that can be sorted: category-grouping
 * charts (bar, combo, box plot) sort their chart-wide category order; a point chart (scatter,
 * line) sorts its own binding's draw order. Either way, "Column" ranks by any column in the
 * dataset — not necessarily one plotted — so {@link columns} is the full schema, not just the
 * axis/category columns offered elsewhere.
 */
@Component({
  selector: 'app-panel-chart-sort',
  imports: [FormsModule, SelectModule],
  templateUrl: './panel-chart-sort.component.html',
})
export class PanelChartSortComponent {
  /** The sort to edit. Null (a binding's own per-row sort, before it's touched) reads as the default. */
  public readonly sort = input.required<ChartSort | null>();

  /** Every column the sort can rank by — the dataset's full schema, not just what's plotted. */
  public readonly columns = input.required<DatasetColumn[]>();

  /** False for a point chart's per-row sort, which has nothing to reduce (each row is its own point). */
  public readonly showAggregate = input(true);

  /** What the chart's own natural order is called here: a category's order, or a point chart's X order. */
  public readonly defaultLabel = input('Category order');

  public readonly sortChange = output<ChartSort>();

  public readonly resolved = computed(() => this.sort() ?? DEFAULT_CHART_SORT);

  public readonly byOptions = computed<{ label: string; value: ChartSortBy }[]>(() => [
    { label: this.defaultLabel(), value: 'default' },
    { label: 'Column…', value: 'column' },
  ]);

  public readonly aggregateOptions: { label: string; value: SortAggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Minimum', value: 'min' },
    { label: 'Maximum', value: 'max' },
    { label: 'Median', value: 'median' },
    { label: 'Spread (IQR)', value: 'spread' },
  ];

  public readonly directionOptions: { label: string; value: boolean }[] = [
    { label: 'Ascending', value: false },
    { label: 'Descending', value: true },
  ];

  public setBy(by: ChartSortBy): void {
    this.sortChange.emit({ ...this.resolved(), by });
  }

  public setColumn(columnId: string | null): void {
    this.sortChange.emit({ ...this.resolved(), columnId });
  }

  public setAggregate(aggregate: SortAggregate): void {
    this.sortChange.emit({ ...this.resolved(), aggregate });
  }

  public setDescending(descending: boolean): void {
    this.sortChange.emit({ ...this.resolved(), descending });
  }
}

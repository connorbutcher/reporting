import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatasetColumn, DatasetColumnType } from '../../../../../core/models/dataset';
import {
  ChartSort,
  ChartSortBy,
  DateGrouping,
  DEFAULT_CHART_SORT,
  SortAggregate,
} from '../../../../../core/models/report';

/** The aggregates a column type can be reduced by — text has no sum/average/median/spread, and
 * summing dates has no meaning either. */
function aggregateOptionsFor(
  type: DatasetColumnType | null,
): { label: string; value: SortAggregate }[] {
  if (type === 'string') {
    return [
      { label: 'First (A–Z)', value: 'min' },
      { label: 'Last (A–Z)', value: 'max' },
      { label: 'Count', value: 'count' },
    ];
  }
  if (type === 'dateTime') {
    return [
      { label: 'Earliest', value: 'min' },
      { label: 'Latest', value: 'max' },
      { label: 'Average', value: 'average' },
      { label: 'Median', value: 'median' },
      { label: 'Spread (IQR)', value: 'spread' },
      { label: 'Count', value: 'count' },
    ];
  }
  return [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Minimum', value: 'min' },
    { label: 'Maximum', value: 'max' },
    { label: 'Median', value: 'median' },
    { label: 'Spread (IQR)', value: 'spread' },
  ];
}

/**
 * A chart's order control, shared by every chart kind that can be sorted: category-grouping
 * charts (bar, combo, box plot) sort their chart-wide category order; a point chart (scatter,
 * line) sorts its own binding's draw order. Either way, "Column" ranks by any column in the
 * dataset — not necessarily one plotted — so {@link columns} is the full schema, not just the
 * axis/category columns offered elsewhere.
 */
@Component({
  selector: 'app-panel-chart-sort',
  imports: [FormsModule, CheckboxModule, InputNumberModule, SelectModule],
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

  /**
   * The category column, so a date category can offer period grouping. Grouping is only offered when
   * {@link grouping} is bound (not undefined) and this column is a date.
   */
  public readonly categoryColumnId = input<string | null>(null);

  /** The chart's date grouping; undefined when the chart doesn't group its categories. */
  public readonly grouping = input<DateGrouping | null | undefined>(undefined);

  public readonly groupingChange = output<DateGrouping | null>();

  /** Offers "Top N, rest as Other" — bar and combination charts only. */
  public readonly showTopN = input(false);

  public readonly showGrouping = computed(() => {
    if (this.grouping() === undefined) return false;
    const id = this.categoryColumnId();
    return !!id && this.columns().find((c) => c.id === id)?.type === 'dateTime';
  });

  /** Period choices for a date category; null groups by the exact date. */
  public readonly groupings: { label: string; value: DateGrouping | null }[] = [
    { label: 'Exact date', value: null },
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  public readonly resolved = computed(() => this.sort() ?? DEFAULT_CHART_SORT);

  public readonly byOptions = computed<{ label: string; value: ChartSortBy }[]>(() => [
    { label: this.defaultLabel(), value: 'default' },
    { label: 'Column…', value: 'column' },
  ]);

  /** The sort column's own type, so the aggregate list can drop options that don't apply to it. */
  private readonly selectedColumnType = computed(() => {
    const columnId = this.resolved().columnId;
    return columnId ? (this.columns().find((c) => c.id === columnId)?.type ?? null) : null;
  });

  public readonly aggregateOptions = computed(() => aggregateOptionsFor(this.selectedColumnType()));

  /**
   * Shown next to the aggregate picker for text/date columns, where "first"/"last" (earliest/
   * latest) only has a visible effect if a category actually holds more than one distinct value
   * for the column — otherwise it's the same single value either way, and Direction alone decides
   * the order.
   */
  public readonly showAggregateHint = computed(() => {
    const type = this.selectedColumnType();
    return type === 'string' || type === 'dateTime';
  });

  public readonly directionOptions: { label: string; value: boolean }[] = [
    { label: 'Ascending', value: false },
    { label: 'Descending', value: true },
  ];

  public setBy(by: ChartSortBy): void {
    this.sortChange.emit({ ...this.resolved(), by });
  }

  public setColumn(columnId: string | null): void {
    const resolved = this.resolved();
    const type = columnId ? (this.columns().find((c) => c.id === columnId)?.type ?? null) : null;
    // The new column may not support the previously-picked aggregate (e.g. switching from a
    // numeric column's "Sum" to a text one) — fall back to its first valid aggregate instead of
    // carrying over a now-meaningless choice.
    const validValues = aggregateOptionsFor(type).map((o) => o.value);
    const aggregate = validValues.includes(resolved.aggregate)
      ? resolved.aggregate
      : validValues[0];
    this.sortChange.emit({ ...resolved, columnId, aggregate });
  }

  public setAggregate(aggregate: SortAggregate): void {
    this.sortChange.emit({ ...this.resolved(), aggregate });
  }

  public setDescending(descending: boolean): void {
    this.sortChange.emit({ ...this.resolved(), descending });
  }

  public setLimit(limit: number | null): void {
    this.sortChange.emit({
      ...this.resolved(),
      limit: limit != null && limit > 0 ? Math.floor(limit) : null,
    });
  }

  public setShowOther(showOther: boolean): void {
    this.sortChange.emit({ ...this.resolved(), showOther });
  }
}

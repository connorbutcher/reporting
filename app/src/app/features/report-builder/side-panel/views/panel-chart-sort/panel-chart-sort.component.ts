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
  WidgetConfigDefaults,
  SortAggregate,
} from '../../../../../core/models/report';

/**
 * A chart's sort control. Grouping charts sort their categories; point charts sort a binding's draw
 * order. "Column" can rank by any column, so {@link columns} is the full schema.
 */
@Component({
  selector: 'app-panel-chart-sort',
  imports: [FormsModule, CheckboxModule, InputNumberModule, SelectModule],
  templateUrl: './panel-chart-sort.component.html',
})
export class PanelChartSortComponent {
  /** Null reads as the default. */
  public readonly sort = input.required<ChartSort | null>();
  public readonly columns = input.required<DatasetColumn[]>();

  /** False for a point chart, where each row is its own point. */
  public readonly showAggregate = input(true);

  /** What the natural order is called: category order, or X order. */
  public readonly defaultLabel = input('Category order');
  public readonly sortChange = output<ChartSort>();

  /** A date category can offer period grouping, when {@link grouping} is bound. */
  public readonly categoryColumnId = input<string | null>(null);

  /** Undefined when the chart doesn't group its categories. */
  public readonly grouping = input<DateGrouping | null | undefined>(undefined);
  public readonly groupingChange = output<DateGrouping | null>();

  /** Bar and combination charts only. */
  public readonly showTopN = input(false);

  public readonly showGrouping = computed(() => {
    if (this.grouping() === undefined) {
      return false;
    }
    const id = this.categoryColumnId();
    return !!id && this.columns().find((c) => c.id === id)?.type === 'dateTime';
  });

  /** Null groups by exact date. */
  public readonly groupings: { label: string; value: DateGrouping | null }[] = [
    { label: 'Exact date', value: null },
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  public readonly resolved = computed(() => this.sort() ?? WidgetConfigDefaults.CHART_SORT);

  public readonly byOptions = computed<{ label: string; value: ChartSortBy }[]>(() => [
    { label: this.defaultLabel(), value: 'default' },
    { label: 'Column…', value: 'column' },
  ]);

  public readonly aggregateOptions = computed(() =>
    PanelChartSortComponent.aggregateOptionsFor(this.selectedColumnType()),
  );

  /** First/last only matter when a category holds several distinct values of a text or date column. */
  public readonly showAggregateHint = computed(() => {
    const type = this.selectedColumnType();
    return type === 'string' || type === 'dateTime';
  });

  public readonly directionOptions: { label: string; value: boolean }[] = [
    { label: 'Ascending', value: false },
    { label: 'Descending', value: true },
  ];

  private readonly selectedColumnType = computed(() => {
    const columnId = this.resolved().columnId;
    return columnId ? (this.columns().find((c) => c.id === columnId)?.type ?? null) : null;
  });

  /** Text and dates can't be summed or averaged. */
  private static aggregateOptionsFor(
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

  public setBy(by: ChartSortBy): void {
    this.sortChange.emit({ ...this.resolved(), by });
  }

  public setColumn(columnId: string | null): void {
    const resolved = this.resolved();
    const type = columnId ? (this.columns().find((c) => c.id === columnId)?.type ?? null) : null;
    // Fall back to the new column's first valid aggregate if the old one doesn't apply.
    const validValues = PanelChartSortComponent.aggregateOptionsFor(type).map((o) => o.value);
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

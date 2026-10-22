import { ChartSortBy } from './chart-sort-by.model';
import { SortAggregate } from './sort-aggregate.model';

/**
 * How a chart orders its categories (bar, combo, box plot) or its points (scatter, line).
 * `by: 'default'` keeps the chart's own natural order — the category column's own order, or X
 * ascending. `by: 'column'` ranks by any column in the dataset, not necessarily one plotted on
 * the chart, reduced per category by `aggregate` (ignored for a point chart, whose rows aren't
 * grouped).
 */
export type ChartSort = {
  by: ChartSortBy;
  /** The column to rank by; required (and resolved against its own dataset) when `by` is `'column'`. */
  columnId: string | null;
  aggregate: SortAggregate;
  descending: boolean;
  /** Keeps only the first N categories in this order (bar and combination charts); null keeps them all. */
  limit?: number | null;
  /** With `limit`, rolls the remaining categories into one "Other" category. */
  showOther?: boolean;
};

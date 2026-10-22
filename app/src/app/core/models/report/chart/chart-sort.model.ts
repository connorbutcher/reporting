import { ChartSortBy } from './chart-sort-by.model';
import { SortAggregate } from './sort-aggregate.model';

/**
 * Category or point order. `default` keeps the natural order; `column` ranks by any column, reduced
 * per category by `aggregate`.
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

import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { Aggregate } from './aggregate.model';
import { ChartSort } from './chart-sort.model';
import { DateGrouping } from '../pivot/date-grouping.model';

/**
 * A bar chart. Unlike scatter/line it doesn't plot raw rows: rows are grouped by
 * its binding's category column (`xColumnId`) and each group's values in the
 * measure column (`yColumnId`) are reduced to one bar by `aggregate`. The measure
 * is unused — and may be left unbound — when `aggregate` is `'count'`, which counts rows.
 */
export type BarChartWidgetConfig = ChartWidgetConfigBase & {
  type: 'barChart';

  aggregate: Aggregate;
  /** Stacks a category's series bars into one column instead of placing them side by side. */
  stacked: boolean;
  /** Draws bars horizontally (categories down the Y axis) rather than as vertical columns. */
  horizontal: boolean;
  /** How the bars are ordered along the category axis. */
  sort: ChartSort;
  /** Buckets a date category by period; null/absent groups by the exact date. */
  categoryGrouping?: DateGrouping | null;
  /** Stacks each category's bars as shares of its total (100% stacked); implies stacked. */
  percentStacked?: boolean;
  /** Prints each stack's total above it. */
  showStackTotals?: boolean;
};

import { FilterGroup } from '../../filter';
import {
  Aggregate,
  ChartSort,
  ChartToleranceBand,
  ChartTooltipColumn,
  DateGrouping,
} from '../../report';

export type BarChartQueryRequest = {
  filter: FilterGroup | null;
  /** The column whose distinct values become the bars (any type). */
  categoryColumnId: string;
  /** The numeric columns the aggregate reduces, each a series. Empty — and ignored — for 'count'. */
  valueColumnIds: string[];
  aggregate: Aggregate;
  seriesColumnId: string | null;
  toleranceBands: ChartToleranceBand[];
  /** How the bars are ordered along the category axis. */
  sort: ChartSort;
  categoryGrouping?: DateGrouping | null;
  tooltipColumns?: ChartTooltipColumn[];
};

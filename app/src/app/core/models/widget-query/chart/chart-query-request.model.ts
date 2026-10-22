import { FilterGroup } from '../../filter';
import {
  Aggregate,
  ChartSort,
  ChartToleranceBand,
  ChartTooltipColumn,
  DateGrouping,
} from '../../report';

export type ChartQueryRequest = {
  filter: FilterGroup | null;
  xColumnId: string;
  yColumnId: string;
  seriesColumnId: string | null;
  /** Scales each point's marker by this numeric column's value — a scatter bubble chart. */
  sizeColumnId?: string | null;
  toleranceBands: ChartToleranceBand[];
  tooltipColumns: ChartTooltipColumn[];
  /** Draw order for the returned points; null keeps the default X-ascending order. */
  sort?: ChartSort | null;
  /** Fits a least-squares trend line per series, when both axes are numeric/date. */
  showTrendLine?: boolean;
  /** Reduces every row sharing an X value to one point; null plots raw rows. */
  aggregate?: Aggregate | null;
  /** Buckets a date X by period before aggregating. */
  xGrouping?: DateGrouping | null;
};

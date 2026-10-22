import { FilterGroup } from '../../filter';
import {
  BoxWhisker,
  ChartSort,
  ChartToleranceBand,
  ChartTooltipColumn,
  DateGrouping,
} from '../../report';

export type BoxPlotQueryRequest = {
  filter: FilterGroup | null;
  /** The column whose distinct values become the boxes (any type). */
  categoryColumnId: string;
  /** The numeric column whose per-category distribution each box summarises. */
  valueColumnId: string;
  seriesColumnId: string | null;
  whisker: BoxWhisker;
  /** The whisker length multiplier — of the IQR for `tukey`, of the standard deviation for `stdDev`. */
  whiskerFactor: number;
  sort: ChartSort;
  /** Requests a capped sample of each box's raw values, for the jittered overlay. */
  includePoints: boolean;
  toleranceBands: ChartToleranceBand[];
  categoryGrouping?: DateGrouping | null;
  /** Extra numeric columns averaged over each box's rows, for its tooltip. */
  tooltipColumns?: ChartTooltipColumn[];
};

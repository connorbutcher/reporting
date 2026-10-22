import { FilterGroup } from '../../filter';
import { ChartSort, ChartToleranceBand, ControlChartMode, DateGrouping } from '../../report';

export type XBarRChartQueryRequest = {
  filter: FilterGroup | null;
  /** The column whose distinct values become the subgroups (any type). */
  categoryColumnId: string;
  /** The numeric column whose per-subgroup mean and range are plotted. */
  valueColumnId: string;
  sort: ChartSort;
  toleranceBands: ChartToleranceBand[];
  categoryGrouping?: DateGrouping | null;
  mode?: ControlChartMode;
  baselineSubgroups?: number | null;
  runRules?: boolean;
};

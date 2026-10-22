import { ChartSort, ChartToleranceBand, ControlChartMode, DateGrouping } from '../report';
import { FilterGroup } from '../filter';
import { ChartCategoryDetail, ChartRowCounts, ResolvedToleranceBand } from './chart-query.model';

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

/**
 * One subgroup's mean and range, plus the control limits it's judged against — carried per
 * subgroup rather than once for the whole chart, since they vary with that subgroup's own sample
 * size when subgroup sizes aren't all equal.
 */
export type XBarRSubgroup = {
  mean: number;
  range: number;
  /** How many rows fed this subgroup. */
  count: number;
  /** False for a subgroup of one, or the first individual (no moving range yet). */
  hasRange?: boolean;
  xBarUcl: number;
  xBarLcl: number;
  rUcl: number;
  rLcl: number;
  /** Whether this subgroup's mean falls outside its own X-bar control limits. */
  meanOutOfControl: boolean;
  /** Whether this subgroup's range falls outside its own R control limits. */
  rangeOutOfControl: boolean;
  /** Nelson rules (1–5) broken on the mean/value chart. */
  meanRules?: number[];
  /** Nelson rules broken on the range/σ/moving-range chart. */
  rangeRules?: number[];
};

export type XBarRChartQueryResult = ChartRowCounts & {
  id: string;
  name: string;
  /** The subgroup labels, in display order — the shared axis both charts align to. */
  categories: string[];
  /** One entry per category, in the same order. */
  subgroups: XBarRSubgroup[];
  /** The grand average of the subgroup means — the X-bar chart's centre line. */
  xBarCenterLine: number;
  /** The average subgroup range — the R chart's centre line. */
  rCenterLine: number;
  mode?: ControlChartMode;
  /** Points the limits were computed from, when a baseline held them. */
  baselineCount?: number | null;
  categoryDetails?: ChartCategoryDetail[];
  toleranceBands: ResolvedToleranceBand[];
};

import { ChartRowCounts } from '../chart/chart-row-counts.model';
import { XBarRSubgroup } from './xbar-r-subgroup.model';
import { ControlChartMode } from '../../report';
import { ChartCategoryDetail } from '../chart/chart-category-detail.model';
import { ResolvedToleranceBand } from '../chart/resolved-tolerance-band.model';

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

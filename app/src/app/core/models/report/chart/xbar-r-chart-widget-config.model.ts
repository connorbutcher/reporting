import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { ChartSort } from './chart-sort.model';
import { DateGrouping } from '../pivot/date-grouping.model';
import { ControlChartMode } from './control-chart-mode.model';

/**
 * A control chart: rows grouped by subgroup, each reduced to a mean and range against limits derived
 * from the data. One process stream, so no series split.
 */
export type XBarRChartWidgetConfig = ChartWidgetConfigBase & {
  type: 'xbarRChart';

  /** Subgroup order, read left to right as sequence. */
  sort: ChartSort;
  highlightOutOfControl: boolean;
  /** Null groups by exact date. */
  categoryGrouping?: DateGrouping | null;
  /** Absent means Xbar-R. */
  mode?: ControlChartMode;
  /** Holds limits from the first N points; null uses every point. */
  baselineSubgroups?: number | null;
  runRules?: boolean;
};

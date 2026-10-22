import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { ChartSort } from './chart-sort.model';
import { DateGrouping } from '../pivot/date-grouping.model';
import { ControlChartMode } from './control-chart-mode.model';

/**
 * An Xbar-R control chart: a Shewhart pair monitoring a process over time. Like a box plot it
 * groups rows by its binding's category column (`xColumnId`) — here the subgroup/sample each row
 * belongs to — but instead of a five-number summary it reduces each subgroup's values in the
 * measure column (`yColumnId`) to a mean and a range, plotted on two stacked charts against
 * control limits derived from the data itself. No series split — a control chart watches one
 * process stream.
 */
export type XBarRChartWidgetConfig = ChartWidgetConfigBase & {
  type: 'xbarRChart';

  /** How the subgroups are ordered along the shared axis — critical here, since the chart reads
   * left-to-right as a time/sequence order, not an arbitrary category ranking. */
  sort: ChartSort;
  /** Colours a subgroup's mean or range red when it falls outside its control limits. */
  highlightOutOfControl: boolean;
  /** Buckets a date subgroup column by period; null/absent groups by the exact date. */
  categoryGrouping?: DateGrouping | null;
  /** Which pair of control charts to draw; absent means Xbar-R. */
  mode?: ControlChartMode;
  /** Computes the limits from only the first N points and holds them; null/absent uses every point. */
  baselineSubgroups?: number | null;
  /** Also flags the Nelson run rules 2–5, not just points beyond the limits. */
  runRules?: boolean;
};

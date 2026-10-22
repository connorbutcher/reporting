import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { Aggregate } from './aggregate.model';
import { ChartSort } from './chart-sort.model';
import { DateGrouping } from '../pivot/date-grouping.model';

/**
 * A combination chart: the bar chart's category + aggregate data model, but each series (binding)
 * is drawn either as bars or as a line over the shared categories — the classic bars-and-lines
 * combo. Series can be assigned to separate value axes (see {@link ChartWidgetConfigBase.yAxes}),
 * so bars on one scale and a line on another read cleanly. Reuses the bar query end to end; only
 * the rendering differs, per {@link ChartSeriesBinding.renderAs}.
 */
export type ComboChartWidgetConfig = ChartWidgetConfigBase & {
  type: 'comboChart';

  /** How each category's rows are reduced to one value per series — shared by bars and lines. */
  aggregate: Aggregate;
  /** Stacks each binding's bar series into one column; line series are never stacked. */
  stacked: boolean;
  /** Draws line series with curved rather than straight segments. */
  smooth: boolean;
  /** Whether point markers are drawn along line series. */
  showPoints: boolean;
  /** Shades the area under line series. */
  areaFill: boolean;
  /** How the bars/lines are ordered along the category axis. */
  sort: ChartSort;
  /** Buckets a date category by period; null/absent groups by the exact date. */
  categoryGrouping?: DateGrouping | null;
  /** Draws line series straight across categories they have no value for, instead of breaking. */
  connectNulls?: boolean;
};

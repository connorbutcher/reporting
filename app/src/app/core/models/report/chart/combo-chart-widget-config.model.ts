import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { Aggregate } from './aggregate.model';
import { ChartSort } from './chart-sort.model';
import { DateGrouping } from '../pivot/date-grouping.model';

/** Bar chart data drawn as bars or lines per series ({@link ChartSeriesBinding.renderAs}). */
export type ComboChartWidgetConfig = ChartWidgetConfigBase & {
  type: 'comboChart';

  aggregate: Aggregate;
  /** Line series are never stacked. */
  stacked: boolean;
  smooth: boolean;
  showPoints: boolean;
  areaFill: boolean;
  sort: ChartSort;
  /** Null groups by exact date. */
  categoryGrouping?: DateGrouping | null;
  /** Bridges categories with no value instead of breaking the line. */
  connectNulls?: boolean;
};

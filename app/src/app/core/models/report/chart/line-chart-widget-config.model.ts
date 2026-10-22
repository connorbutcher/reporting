import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { Aggregate } from './aggregate.model';
import { DateGrouping } from '../pivot/date-grouping.model';

export type LineChartWidgetConfig = ChartWidgetConfigBase & {
  type: 'lineChart';

  /** Draws the line with curved rather than straight segments. */
  smooth: boolean;
  /** Whether point markers are drawn along the line. */
  showPoints: boolean;
  /** Shades the area under the line. */
  areaFill: boolean;
  /** Reduces every row sharing an X value (per series) to one point; null/absent plots the raw rows. */
  aggregate?: Aggregate | null;
  /** Buckets a date X axis by period before aggregating; ignored without `aggregate`. */
  xGrouping?: DateGrouping | null;
};

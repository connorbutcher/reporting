import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { BoxWhisker } from './box-whisker.model';
import { ChartSort } from './chart-sort.model';
import { DateGrouping } from '../pivot/date-grouping.model';

/**
 * A box-and-whisker chart. Like a bar chart it groups rows by its binding's category column
 * (`xColumnId`), but instead of one aggregate it summarises each group's values in the measure
 * column (`yColumnId`) into a five-number summary (min, Q1, median, Q3, max) drawn as a box.
 * A series column, if set, splits each category into several boxes side by side.
 */
export type BoxPlotWidgetConfig = ChartWidgetConfigBase & {
  type: 'boxPlot';

  /** Where the whiskers end, and whether outliers are drawn beyond them. */
  whisker: BoxWhisker;
  /** The whisker length multiplier — of the IQR for `tukey`, of the standard deviation for `stdDev`. Ignored for `minMax`. */
  whiskerFactor: number;
  /** How the boxes are ordered along the category axis. */
  sort: ChartSort;
  /** Draws the mean as a marker inside each box, alongside the median line. */
  showMean: boolean;
  /** Prints each box's sample size (n) above it. */
  showSampleSize: boolean;
  /** Overlays the individual measurements as jittered points over each box. */
  showPoints: boolean;
  /**
   * Adds process performance (Pp/Ppk) to each box's tooltip, resolved against the value-axis spec band.
   * Uses the group's overall σ — hence Pp/Ppk rather than the within-subgroup Cp/Cpk.
   */
  showCapability: boolean;
  /** Draws boxes horizontally (categories down the Y axis) rather than upright. */
  horizontal: boolean;
  /** Buckets a date category by period; null/absent groups by the exact date. */
  categoryGrouping?: DateGrouping | null;
};

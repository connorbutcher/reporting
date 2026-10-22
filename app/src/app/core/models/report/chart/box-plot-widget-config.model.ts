import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { BoxWhisker } from './box-whisker.model';
import { ChartSort } from './chart-sort.model';
import { DateGrouping } from '../pivot/date-grouping.model';

/** Groups rows by category and draws each group's measure as a five-number summary. */
export type BoxPlotWidgetConfig = ChartWidgetConfigBase & {
  type: 'boxPlot';

  whisker: BoxWhisker;
  /** IQR multiple for `tukey`, standard deviations for `stdDev`. */
  whiskerFactor: number;
  sort: ChartSort;
  showMean: boolean;
  showSampleSize: boolean;
  showPoints: boolean;
  /** Adds Pp/Ppk to tooltips against the value-axis spec band. */
  showCapability: boolean;
  horizontal: boolean;
  /** Null groups by exact date. */
  categoryGrouping?: DateGrouping | null;
};

import { WidgetConfigBase } from '../widget/widget-config-base.model';
import { ChartSeriesBinding } from './chart-series-binding.model';
import { ChartValueAxis } from './chart-value-axis.model';
import { AxisLabelRotation } from './axis-label-rotation.model';
import { ChartToleranceBand } from './chart-tolerance-band.model';
import { ChartGuideLine } from './chart-guide-line.model';
import { ChartTooltipColumn } from './chart-tooltip-column.model';

/** Settings shared by every chart kind; each kind narrows `type` and adds its own options. */
export type ChartWidgetConfigBase = WidgetConfigBase & {
  /** At least one once set up; a bar chart uses only the first. */
  bindings: ChartSeriesBinding[];

  /**
   * The value (Y) axes, primary first; always at least one. Read through {@link ChartConfigs.axes},
   * which folds in the deprecated {@link yAxisLabel}.
   */
  yAxes: ChartValueAxis[];

  /** Blank falls back to the bound column's own name. */
  xAxisLabel: string;
  /** Deprecated: kept so older reports round-trip; the label now lives on {@link yAxes}. */
  yAxisLabel: string;

  /** Null auto-fits. This and the X-axis options below are ignored on a category axis. */
  xAxisMin?: number | null;
  xAxisMax?: number | null;
  xLogScale?: boolean;
  xAxisInterval?: number | null;
  xAxisRotate?: AxisLabelRotation;
  /** Fits the X axis to the data instead of anchoring at zero. */
  xAxisScale?: boolean;

  /** X zoom and slider on point charts; on grouping charts once there are more than 20 categories. */
  zoom: boolean;
  zoomY?: boolean;
  /** Defaults on. */
  showGridLines?: boolean;
  showValueLabels?: boolean;
  /** Colours point marks by Y value instead of series, replacing the legend. Numeric Y only. */
  colorByValue?: boolean;

  /** Least-squares trend line per series. Point charts only. */
  showTrendLine?: boolean;

  showLegend: boolean;
  pointSize: number;

  toleranceBands: ChartToleranceBand[];
  guideLines: ChartGuideLine[];
  tooltipColumns: ChartTooltipColumn[];
};

import { WidgetConfigBase } from '../widget/widget-config-base.model';
import { ChartSeriesBinding } from './chart-series-binding.model';
import { ChartValueAxis } from './chart-value-axis.model';
import { AxisLabelRotation } from './axis-label-rotation.model';
import { ChartToleranceBand } from './chart-tolerance-band.model';
import { ChartGuideLine } from './chart-guide-line.model';
import { ChartTooltipColumn } from './chart-tooltip-column.model';

/**
 * Configuration common to every chart kind (scatter, line, and future bar/area).
 * Concrete kinds narrow `type` and add their own presentation options; everything
 * about data binding, tolerance bands, tooltips, and filtering is shared here.
 */
export type ChartWidgetConfigBase = WidgetConfigBase & {
  /**
   * The datasets this chart overlays on its shared axes, each queried on its own
   * dataset and its series merged client-side. Always at least one entry once the
   * chart is set up; a bar chart uses only the first.
   */
  bindings: ChartSeriesBinding[];

  /**
   * The value (Y) axes this chart plots against, in order; the first is the
   * primary. Always at least one entry. Point charts can carry several and assign
   * each binding to one; a bar chart uses only the primary. Read through
   * {@link readChartAxes}, which folds the deprecated {@link yAxisLabel} for
   * reports saved before this existed.
   */
  yAxes: ChartValueAxis[];

  /** Blank falls back to the bound column's own name. */
  xAxisLabel: string;
  /** Deprecated: the primary axis's label now lives on {@link yAxes}. Kept so pre-multi-axis reports round-trip; read through {@link readChartAxes}. */
  yAxisLabel: string;

  /** Fixed X-axis lower bound; null/undefined auto-fits. Ignored on a category X axis. */
  xAxisMin?: number | null;
  /** Fixed X-axis upper bound; null/undefined auto-fits. Ignored on a category X axis. */
  xAxisMax?: number | null;
  /** Plots the X axis on a logarithmic scale. Ignored on a category X axis. */
  xLogScale?: boolean;
  /** Forced X-axis tick interval; null/undefined auto-fits. Ignored on a category X axis. */
  xAxisInterval?: number | null;
  /** X-axis tick-label orientation; unset keeps the default. */
  xAxisRotate?: AxisLabelRotation;
  /** Fits the X axis to the data instead of anchoring it at zero. Ignored on a category X axis. */
  xAxisScale?: boolean;

  /** Adds mouse-wheel/drag zoom plus a slider along the X axis to point charts, and along the category axis of a grouping chart once it has more than 20 categories. */
  zoom: boolean;
  /** Adds mouse-wheel/drag zoom along the Y axis to point charts. */
  zoomY?: boolean;
  /** Draws the plot's gridlines; off gives a cleaner, lineless look. Defaults on. */
  showGridLines?: boolean;
  /** Prints each point's/bar's value beside it. */
  showValueLabels?: boolean;
  /**
   * Colours point-chart marks by their Y value on a continuous scale (an echarts visualMap)
   * instead of by series — turns a scatter/line into a value heat view. Ignored when the Y axis
   * isn't numeric; replaces the series legend while on.
   */
  colorByValue?: boolean;

  /** Fits and draws a least-squares trend line per series. Point charts only; ignored by grouping charts. */
  showTrendLine?: boolean;

  showLegend: boolean;
  pointSize: number;

  /** Dashed reference lines for one or more specs plotted against an axis. */
  toleranceBands: ChartToleranceBand[];
  /** Dashed, labelled lines at fixed values — the simpler alternative to a tolerance band. */
  guideLines: ChartGuideLine[];
  /** Extra fields shown in a point's tooltip, in order, beyond the X/Y values. */
  tooltipColumns: ChartTooltipColumn[];
};

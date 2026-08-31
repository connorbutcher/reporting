import { FilterGroup } from '../filter';
import { WidgetConfigBase } from './widget-base.model';

/** How a bar chart reduces the many rows in one category down to a single bar height. */
export type Aggregate = 'sum' | 'average' | 'count' | 'min' | 'max';

export type ChartAxis = 'x' | 'y';

/** Which side of the plot a value axis sits on. */
export type AxisSide = 'left' | 'right';

/** A point marker shape a series can be drawn with; `none` hides the marker. */
export type ChartSymbol = 'circle' | 'rect' | 'triangle' | 'diamond' | 'none';

/** How a line series' stroke is dashed. */
export type LineDashStyle = 'solid' | 'dashed' | 'dotted';

/**
 * One value (Y) axis a chart plots against. A chart always has at least the
 * primary axis (the first in {@link ChartWidgetConfigBase.yAxes}); adding more
 * lets overlaid datasets with different scales each get a readable axis — the
 * echarts multi-axis / dual-axis chart. Only point charts (scatter, line) use
 * more than one; a bar chart has a single value axis.
 */
export interface ChartValueAxis {
  /** Client-generated, referenced by a binding's {@link ChartSeriesBinding.yAxisId} — not meaningful server-side. */
  id: string;
  /** Blank falls back to the bound column's name (primary axis) or the axis's default label. */
  label: string;
  side: AxisSide;
  /** Fixed lower bound; null/undefined lets echarts fit the data. Ignored on a category axis. */
  min?: number | null;
  /** Fixed upper bound; null/undefined lets echarts fit the data. Ignored on a category axis. */
  max?: number | null;
  /** Plots this axis on a logarithmic scale. Ignored on a category axis. */
  logScale?: boolean;
}

/** The primary axis's id: constant so a legacy-folded config and null bindings agree on it. */
export const PRIMARY_AXIS_ID = 'primary';

/**
 * Reference lines drawn on one axis, resolved against one row of a separate
 * limits dataset — the chart equivalent of a table column's ToleranceConfig.
 * A chart can carry several, e.g. one per spec being plotted.
 */
export interface ChartToleranceBand {
  /** Client-generated, only for addressing this band in the editor — not meaningful server-side. */
  id: string;
  axis: ChartAxis;
  /**
   * Which value axis a `y` band draws against, by {@link ChartValueAxis.id}; null —
   * or an id no longer among the chart's axes — falls back to the primary. Ignored
   * for an `x` band (the X axis is shared). Lets a band sit on the scale of the
   * series it bounds rather than always the primary axis.
   */
  yAxisId?: string | null;
  sourceDatasetId: number;
  sourceRowId: string;
  minColumnId: string;
  maxColumnId: string;
  concessionLowerColumnId?: string;
  concessionUpperColumnId?: string;
  /** Shades the in-spec zone (and any concession shoulders) between the band's lines. */
  fill?: boolean;
  /** Outlines plotted points that fall outside the band's outermost line. */
  outlinePoints?: boolean;
}

/** One extra field shown in a point's tooltip, beyond the X/Y values. */
export interface ChartTooltipColumn {
  columnId: string;
  prefix?: string;
  suffix?: string;
}

/**
 * One dataset's contribution to a chart: its axes, optional per-value split, and
 * row filter. A chart carries one or more of these; several overlaid on shared
 * axes is how two datasets are plotted against each other. Each binding is
 * queried on its own dataset and its series merged client-side.
 */
export interface ChartSeriesBinding {
  /** Client-generated, addresses this binding in the editor — not meaningful server-side. */
  id: string;
  /** Null until the user binds this series to a dataset. */
  datasetId: number | null;
  xColumnId: string | null;
  yColumnId: string | null;
  /** Splits this binding into a separate coloured series per distinct value. Null plots one. */
  seriesColumnId: string | null;
  /**
   * Which value axis this binding plots against, by {@link ChartValueAxis.id}.
   * Null — or an id no longer among the chart's axes — falls back to the primary
   * (first) axis. Only meaningful for point charts.
   */
  yAxisId: string | null;
  /** Blank falls back to the dataset/column name in the legend. */
  label: string;
  /** Overrides the auto-assigned palette colour; null uses the palette. Ignored when the binding splits by colour. */
  color?: string | null;
  /** Point marker shape; null uses the chart kind's default. */
  symbol?: ChartSymbol | null;
  /** Line dash for a line series; null draws solid. */
  dashStyle?: LineDashStyle | null;
  /** Rows this binding plots, narrowed server-side. Null means no per-series filter. */
  filter: FilterGroup | null;
}

/**
 * Configuration common to every chart kind (scatter, line, and future bar/area).
 * Concrete kinds narrow `type` and add their own presentation options; everything
 * about data binding, tolerance bands, tooltips, and filtering is shared here.
 */
export interface ChartWidgetConfigBase extends WidgetConfigBase {
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

  /** Adds mouse-wheel/drag zoom plus a slider to point charts so dense plots can be explored. */
  zoom: boolean;

  showLegend: boolean;
  pointSize: number;

  /** Dashed reference lines for one or more specs plotted against an axis. */
  toleranceBands: ChartToleranceBand[];
  /** Extra fields shown in a point's tooltip, in order, beyond the X/Y values. */
  tooltipColumns: ChartTooltipColumn[];
}

export interface ScatterChartWidgetConfig extends ChartWidgetConfigBase {
  type: 'scatterChart';
}

export interface LineChartWidgetConfig extends ChartWidgetConfigBase {
  type: 'lineChart';

  /** Draws the line with curved rather than straight segments. */
  smooth: boolean;
  /** Whether point markers are drawn along the line. */
  showPoints: boolean;
  /** Shades the area under the line. */
  areaFill: boolean;
}

/**
 * A bar chart. Unlike scatter/line it doesn't plot raw rows: rows are grouped by
 * its binding's category column (`xColumnId`) and each group's values in the
 * measure column (`yColumnId`) are reduced to one bar by `aggregate`. The measure
 * is unused — and may be left unbound — when `aggregate` is `'count'`, which counts rows.
 */
export interface BarChartWidgetConfig extends ChartWidgetConfigBase {
  type: 'barChart';

  aggregate: Aggregate;
  /** Stacks a category's series bars into one column instead of placing them side by side. */
  stacked: boolean;
  /** Draws bars horizontally (categories down the Y axis) rather than as vertical columns. */
  horizontal: boolean;
}

export type ChartWidgetConfig =
  | ScatterChartWidgetConfig
  | LineChartWidgetConfig
  | BarChartWidgetConfig;

const DEFAULT_CHART_CONFIG_BASE: Omit<ChartWidgetConfigBase, 'type' | 'title'> = {
  showTitle: true,
  // A fresh chart starts with no bindings; the model seeds an empty one so the
  // panel has a row to bind. Axes are likewise left empty and synthesised into a
  // single primary axis by readChartAxes.
  bindings: [],
  yAxes: [],
  xAxisLabel: '',
  yAxisLabel: '',
  zoom: true,
  showLegend: true,
  pointSize: 8,
  toleranceBands: [],
  tooltipColumns: [],
};

export const DEFAULT_SCATTER_CHART_CONFIG: Omit<ScatterChartWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Scatter chart',
};

export const DEFAULT_LINE_CHART_CONFIG: Omit<LineChartWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Line chart',
  smooth: false,
  showPoints: true,
  areaFill: false,
};

export const DEFAULT_BAR_CHART_CONFIG: Omit<BarChartWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Bar chart',
  aggregate: 'sum',
  stacked: false,
  horizontal: false,
};

/** A blank series binding; the id is filled in per instance. */
export const EMPTY_CHART_BINDING: Omit<ChartSeriesBinding, 'id'> = {
  datasetId: null,
  xColumnId: null,
  yColumnId: null,
  seriesColumnId: null,
  yAxisId: null,
  label: '',
  color: null,
  symbol: null,
  dashStyle: null,
  filter: null,
};

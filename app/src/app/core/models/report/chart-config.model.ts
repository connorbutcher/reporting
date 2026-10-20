import { FilterGroup } from '../filter';
import { DateGrouping } from './pivot-config.model';
import { WidgetConfigBase } from './widget-base.model';

/** How a bar chart reduces the many rows in one category down to a single bar height. */
export type Aggregate = 'sum' | 'average' | 'count' | 'min' | 'max';

/**
 * Where a box plot's whiskers end. `tukey` stops them a multiple (see {@link BoxPlotWidgetConfig.whiskerFactor})
 * of the IQR past the quartiles; `stdDev` stops them that multiple of the standard deviation either side of
 * the mean; both draw anything beyond as outliers. `minMax` reaches the group's actual extremes with no outliers.
 */
export type BoxWhisker = 'tukey' | 'minMax' | 'stdDev';

/**
 * What a chart's own order falls back to when nothing overrides it: a bar/combo/box plot's
 * category order, or a point chart's X order.
 */
export type ChartSortBy = 'default' | 'column';

/**
 * How several rows in one category collapse to the single number a sort ranks it by. Ignored by
 * a point chart's per-row sort, which has nothing to reduce — each row is its own point.
 */
export type SortAggregate = 'sum' | 'average' | 'count' | 'min' | 'max' | 'median' | 'spread';

/**
 * How a chart orders its categories (bar, combo, box plot) or its points (scatter, line).
 * `by: 'default'` keeps the chart's own natural order — the category column's own order, or X
 * ascending. `by: 'column'` ranks by any column in the dataset, not necessarily one plotted on
 * the chart, reduced per category by `aggregate` (ignored for a point chart, whose rows aren't
 * grouped).
 */
export interface ChartSort {
  by: ChartSortBy;
  /** The column to rank by; required (and resolved against its own dataset) when `by` is `'column'`. */
  columnId: string | null;
  aggregate: SortAggregate;
  descending: boolean;
  /** Keeps only the first N categories in this order (bar and combination charts); null keeps them all. */
  limit?: number | null;
  /** With `limit`, rolls the remaining categories into one "Other" category. */
  showOther?: boolean;
}

/** A fresh sort: the chart's own natural order, ascending. */
export const DEFAULT_CHART_SORT: ChartSort = {
  by: 'default',
  columnId: null,
  aggregate: 'sum',
  descending: false,
};

/**
 * How a histogram chooses its bin edges. `count` divides the range into a fixed number of equal
 * bins; `width` tiles bins of a fixed width across it; `auto` picks the count from the data
 * (Freedman–Diaconis, falling back to Sturges).
 */
export type HistogramBinMode = 'count' | 'width' | 'auto';

/**
 * What a histogram bar's height represents: the raw `count` of values in the bin, its `frequency`
 * (share of all values), or its `density` (frequency divided by bin width, so the bars integrate to 1).
 */
export type HistogramNormalize = 'count' | 'frequency' | 'density';

export type ChartAxis = 'x' | 'y';

/** Which side of the plot a value axis sits on. */
export type AxisSide = 'left' | 'right';

/** A point marker shape a series can be drawn with; `none` hides the marker. */
export type ChartSymbol = 'circle' | 'rect' | 'triangle' | 'diamond' | 'none';

/** How a line series' stroke is dashed. */
export type LineDashStyle = 'solid' | 'dashed' | 'dotted';

/** Which side of a single-value guide line counts as out of range. Irrelevant once the line is a range. */
export type LineDirection = 'above' | 'below';

/** How a combination chart draws one series' aggregated values: as bars, or as a line over the categories. */
export type ChartSeriesRenderAs = 'bar' | 'line';

/** Tick-label orientation for an axis; unset keeps the chart's default (e.g. a bar's auto-tilt). */
export type AxisLabelRotation = 'horizontal' | 'vertical';

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
  /** Forced tick interval; null/undefined lets echarts choose. Ignored on a category axis. */
  interval?: number | null;
  /** Tick-label orientation; unset keeps the default. */
  rotate?: AxisLabelRotation;
  /** Fits the axis to the data instead of anchoring it at zero. Ignored on a category axis. */
  scale?: boolean;
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

/**
 * A single dashed line drawn at a fixed value on an axis, captioned with a short label —
 * the lightweight alternative to a {@link ChartToleranceBand} for marking a target, a cap,
 * or any other fixed point that doesn't need resolving against a separate dataset row.
 */
export interface ChartGuideLine {
  /** Client-generated, only for addressing this line in the editor — not meaningful server-side. */
  id: string;
  axis: ChartAxis;
  /**
   * Which value axis a `y` line draws against, by {@link ChartValueAxis.id}; null — or an id
   * no longer among the chart's axes — falls back to the primary. Ignored for an `x` line.
   */
  yAxisId?: string | null;
  /** The line's fixed position on the axis. */
  value: number;
  /** The region's other edge; null keeps this a single line rather than a shaded range. */
  valueTo?: number | null;
  /** The caption drawn on the line; blank falls back to the formatted value. */
  label: string;
  /** Overrides the default guide colour; null uses the default. */
  color?: string | null;
  /** Line dash; null draws dashed. */
  dashStyle?: LineDashStyle | null;
  /** Shades the zone between `value` and `valueTo`. Ignored when `valueTo` is null. */
  fill?: boolean;
  /** Outlines plotted points on the wrong side of the line (or outside the range, once it's one). */
  outlinePoints?: boolean;
  /**
   * For a single-value line only (ignored once `valueTo` is set): which side of `value` is out
   * of range. Null/absent defaults to `above`.
   */
  direction?: LineDirection | null;
}

/** One extra field shown in a point's tooltip, beyond the X/Y values. */
export interface ChartTooltipColumn {
  columnId: string;
  prefix?: string;
  suffix?: string;
  /**
   * The column's name, sent at query time only so a dataset other than the one the column was
   * picked from can fall back to its own column of that name.
   */
  columnName?: string;
}

/** Which pair of control charts an Xbar-R widget draws. */
export type ControlChartMode = 'xBarR' | 'xBarS' | 'individuals' | 'p' | 'np';

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
  /**
   * Scales each point's marker by this numeric column's value — a bubble chart. Scatter only;
   * ignored by every other chart kind (including line, where a varying marker size over a
   * connected line reads poorly).
   */
  sizeColumnId?: string | null;
  /**
   * A bar chart's measures, each plotted as its own series (grouped or stacked). Null/empty on
   * point and box charts, which use the single {@link yColumnId}. When a bar binding has these,
   * {@link yColumnId} mirrors the first so code reading a single measure still resolves one.
   * Read through {@link barValueColumnIds}, which folds a legacy single-measure binding.
   */
  valueColumnIds?: string[] | null;
  /** Splits this binding into a separate coloured series per distinct value. Null plots one. */
  seriesColumnId: string | null;
  /**
   * On a combination chart, whether this series is drawn as bars or as a line over the categories;
   * null/absent means bars. Ignored by every other chart kind, which draws all series the one way.
   */
  renderAs?: ChartSeriesRenderAs | null;
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
  /**
   * Draw order for a point chart's (scatter/line) own rows — each binding's points are queried
   * and ordered independently, since overlaid bindings don't share a merged axis the way bar's
   * categories do. Null keeps the default X-ascending order. Ignored by every grouping chart
   * (bar, combo, box plot, histogram), which order via their own chart-level `sort` instead.
   */
  sort?: ChartSort | null;
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
  /** Reduces every row sharing an X value (per series) to one point; null/absent plots the raw rows. */
  aggregate?: Aggregate | null;
  /** Buckets a date X axis by period before aggregating; ignored without `aggregate`. */
  xGrouping?: DateGrouping | null;
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
  /** How the bars are ordered along the category axis. */
  sort: ChartSort;
  /** Buckets a date category by period; null/absent groups by the exact date. */
  categoryGrouping?: DateGrouping | null;
  /** Stacks each category's bars as shares of its total (100% stacked); implies stacked. */
  percentStacked?: boolean;
  /** Prints each stack's total above it. */
  showStackTotals?: boolean;
}

/**
 * A combination chart: the bar chart's category + aggregate data model, but each series (binding)
 * is drawn either as bars or as a line over the shared categories — the classic bars-and-lines
 * combo. Series can be assigned to separate value axes (see {@link ChartWidgetConfigBase.yAxes}),
 * so bars on one scale and a line on another read cleanly. Reuses the bar query end to end; only
 * the rendering differs, per {@link ChartSeriesBinding.renderAs}.
 */
export interface ComboChartWidgetConfig extends ChartWidgetConfigBase {
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
}

/**
 * A box-and-whisker chart. Like a bar chart it groups rows by its binding's category column
 * (`xColumnId`), but instead of one aggregate it summarises each group's values in the measure
 * column (`yColumnId`) into a five-number summary (min, Q1, median, Q3, max) drawn as a box.
 * A series column, if set, splits each category into several boxes side by side.
 */
export interface BoxPlotWidgetConfig extends ChartWidgetConfigBase {
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
}

/**
 * A histogram. Unlike the other charts it plots the distribution of a single numeric column
 * (`xColumnId`): its values are binned into equal ranges and each bin's frequency drawn as a bar.
 * A series column, if set, overlays a separate distribution per distinct value.
 */
export interface HistogramWidgetConfig extends ChartWidgetConfigBase {
  type: 'histogram';

  /** How the bin edges are chosen. */
  binMode: HistogramBinMode;
  /** The number of bins for `count` mode; ignored otherwise. */
  binCount: number;
  /** The width of each bin for `width` mode; ignored otherwise. */
  binWidth: number;
  /** Fixed lower bound of the binned range; null/undefined uses the data's minimum. */
  rangeMin?: number | null;
  /** Fixed upper bound of the binned range; null/undefined uses the data's maximum. */
  rangeMax?: number | null;
  /** Whether each bar shows a raw count, a relative frequency, or a density. */
  normalize: HistogramNormalize;
  /** Accumulates each bin into the ones before it, drawing a cumulative distribution. */
  cumulative: boolean;
  /** Draws bars horizontally (bins down the Y axis) rather than as vertical columns. */
  horizontal: boolean;
  /** Overlays a fitted normal curve per series (ignored when cumulative). */
  showNormalCurve?: boolean;
}

/**
 * An Xbar-R control chart: a Shewhart pair monitoring a process over time. Like a box plot it
 * groups rows by its binding's category column (`xColumnId`) — here the subgroup/sample each row
 * belongs to — but instead of a five-number summary it reduces each subgroup's values in the
 * measure column (`yColumnId`) to a mean and a range, plotted on two stacked charts against
 * control limits derived from the data itself. No series split — a control chart watches one
 * process stream.
 */
export interface XBarRChartWidgetConfig extends ChartWidgetConfigBase {
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
}

export type ChartWidgetConfig =
  | ScatterChartWidgetConfig
  | LineChartWidgetConfig
  | BarChartWidgetConfig
  | ComboChartWidgetConfig
  | BoxPlotWidgetConfig
  | HistogramWidgetConfig
  | XBarRChartWidgetConfig;

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
  guideLines: [],
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
  sort: DEFAULT_CHART_SORT,
};

export const DEFAULT_COMBO_CHART_CONFIG: Omit<ComboChartWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Combination chart',
  aggregate: 'sum',
  stacked: false,
  smooth: false,
  showPoints: true,
  areaFill: false,
  sort: DEFAULT_CHART_SORT,
};

export const DEFAULT_BOX_PLOT_CONFIG: Omit<BoxPlotWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Box plot',
  whisker: 'tukey',
  whiskerFactor: 1.5,
  sort: DEFAULT_CHART_SORT,
  showMean: false,
  showSampleSize: false,
  showPoints: false,
  showCapability: false,
  horizontal: false,
};

export const DEFAULT_XBAR_R_CHART_CONFIG: Omit<XBarRChartWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Xbar-R chart',
  sort: DEFAULT_CHART_SORT,
  highlightOutOfControl: true,
};

export const DEFAULT_HISTOGRAM_CONFIG: Omit<HistogramWidgetConfig, 'type'> = {
  ...DEFAULT_CHART_CONFIG_BASE,
  title: 'Histogram',
  binMode: 'auto',
  binCount: 10,
  binWidth: 1,
  rangeMin: null,
  rangeMax: null,
  normalize: 'count',
  cumulative: false,
  horizontal: false,
};

/** A blank series binding; the id is filled in per instance. */
export const EMPTY_CHART_BINDING: Omit<ChartSeriesBinding, 'id'> = {
  datasetId: null,
  xColumnId: null,
  yColumnId: null,
  sizeColumnId: null,
  valueColumnIds: null,
  seriesColumnId: null,
  renderAs: null,
  yAxisId: null,
  label: '',
  color: null,
  symbol: null,
  dashStyle: null,
  filter: null,
  sort: null,
};

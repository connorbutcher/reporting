import type { BarSeriesOption, LineSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  MarkAreaComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts/components';
import type { ComposeOption } from 'echarts/core';
// The composed axis option types aren't surfaced by the tree-shaken entry points, so pull them
// from the root package. These are `import type` only — erased at compile time — so they don't
// drag the full echarts build into the bundle the way a value import would.
import type {
  DefaultLabelFormatterCallbackParams,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';

/**
 * The strongly-typed echarts option for this widget — every builder bundles up to one of these.
 * Composed from exactly the series and components registered in {@link file://./echarts.ts},
 * so autocomplete offers the real option surface and a typo or wrong shape is a compile error.
 * Widen the union here whenever a new series or component is registered there.
 */
export type ECOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | ScatterSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | MarkLineComponentOption
  | MarkAreaComponentOption
  | VisualMapComponentOption
>;

/** The two point-chart series kinds; a bar chart uses {@link BarSeriesOption}. */
export type PointSeriesOption = LineSeriesOption | ScatterSeriesOption;

/**
 * The tick-label config the scale fragments set. echarts parameterises `axisLabel` by axis kind
 * (its `formatter` value is a number for value/time axes, a string for category), so there's no
 * single exported type that fits every axis; this covers the fields we set and stays assignable
 * to all of them (a wider `formatter` param is contravariantly compatible).
 */
export interface AxisLabelFormatting {
  formatter?: (value: number | string, index?: number) => string;
  rotate?: number;
  /** Category axes only: how many labels to skip between shown ones (`0` shows every label). */
  interval?: number;
}

/**
 * One cartesian axis fragment, before the caller layers on name/position/etc. Kept per-scale with
 * a single-literal `type` (and no `mainType`) so the assembled axis narrows cleanly to one member
 * of the discriminated {@link XAXisComponentOption}/{@link YAXisComponentOption} union — a `type`
 * left as a union of literals would be assignable to neither.
 */
export interface ValueAxisFragment {
  type: 'value';
  min?: number;
  max?: number;
  interval?: number;
  /** Fit the axis to the data rather than anchoring it at zero. */
  scale?: boolean;
  axisLabel?: AxisLabelFormatting;
}
export interface CategoryAxisFragment {
  type: 'category';
  data: string[];
  axisLabel?: AxisLabelFormatting;
}
export interface DateAxisFragment {
  type: 'time';
  axisLabel?: AxisLabelFormatting;
}

/**
 * Fill + border styling for an outlined mark. echarts' own `itemStyle` is generic over a
 * per-series data-param callback (a bar's `color` may be a function, a line's may not), so no one
 * exported alias is assignable to every series' data item; this plain shape is assignable to all.
 */
export interface OutlineItemStyle {
  color: string;
  borderColor: string;
  borderWidth: number;
}

/** The data-item element types for tolerance mark lines and shaded areas. */
export type MarkLineData = NonNullable<MarkLineComponentOption['data']>;
export type MarkAreaData = NonNullable<MarkAreaComponentOption['data']>;

/** The echarts callback param passed to a `trigger: 'item'` tooltip formatter. */
export type TooltipCallbackParams = Parameters<
  NonNullable<Extract<TooltipComponentOption['formatter'], (...args: never[]) => unknown>>
>[0];

/** The echarts callback param passed to a series `label.formatter`. */
export type LabelCallbackParams = DefaultLabelFormatterCallbackParams;

export type {
  BarSeriesOption,
  LineSeriesOption,
  ScatterSeriesOption,
  XAXisComponentOption,
  YAXisComponentOption,
};

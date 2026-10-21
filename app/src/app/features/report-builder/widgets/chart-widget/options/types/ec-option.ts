import type {
  BarSeriesOption,
  BoxplotSeriesOption,
  EffectScatterSeriesOption,
  LineSeriesOption,
  ScatterSeriesOption,
} from 'echarts/charts';
import type {
  AriaComponentOption,
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  MarkAreaComponentOption,
  MarkLineComponentOption,
  TitleComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts/components';
import type { ComposeOption } from 'echarts/core';

/**
 * The strongly-typed echarts option for this widget — every builder bundles up to one of these.
 * Composed from exactly the series and components registered in {@link file://../../echarts.ts},
 * so autocomplete offers the real option surface and a typo or wrong shape is a compile error.
 * Widen the union here whenever a new series or component is registered there.
 */
export type ECOption = ComposeOption<
  | BarSeriesOption
  | BoxplotSeriesOption
  | EffectScatterSeriesOption
  | LineSeriesOption
  | ScatterSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | MarkLineComponentOption
  | MarkAreaComponentOption
  | VisualMapComponentOption
  | AriaComponentOption
  | TitleComponentOption
>;

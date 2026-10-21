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
 * The typed echarts option, composed from exactly what {@link file://../../echarts.ts} registers.
 * Widen it whenever a series or component is registered there.
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

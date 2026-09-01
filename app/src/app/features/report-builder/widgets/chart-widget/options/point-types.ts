import {
  ChartSymbol,
  LineChartWidgetConfig,
  LineDashStyle,
  ScatterChartWidgetConfig,
} from '../../../../../core/models/report';
import { OutlineItemStyle } from './chart-option.types';

/** The two chart kinds that plot raw rows as points, as opposed to aggregated bars. */
export type PointChartConfig = ScatterChartWidgetConfig | LineChartWidgetConfig;

/** A coordinate is numeric for a value axis, a category label for a text one. */
export type Coord = number | string;

/** Pixels a second (or later) axis on one side is pushed out, so its scale clears the first. */
export const AXIS_OFFSET = 60;

/**
 * One series' presentation, resolved live from its binding's current config so appearance
 * edits reflect without a refetch. A null colour falls back to the palette (kept for a
 * colour-by split so its per-value colours survive); marker and dash apply when set.
 */
export interface SeriesStyle {
  color: string | null;
  symbol: ChartSymbol | null;
  dashStyle: LineDashStyle | null;
}

export interface ScatterPoint {
  value: [Coord, Coord];
  tooltipLines: string[];
  /** Per-point override, set only for points outlined as out of tolerance. */
  itemStyle?: OutlineItemStyle;
}

export interface ScatterTooltipParams {
  value: [Coord, Coord];
  seriesName: string;
  seriesIndex: number;
  data: ScatterPoint;
}

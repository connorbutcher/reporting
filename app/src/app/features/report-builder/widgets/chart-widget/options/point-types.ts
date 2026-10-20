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
  /** The bubble size column's raw value for this point; undefined when not bound or not set on this row. */
  size?: number | null;
  /** Per-point override, set only for points outlined as out of tolerance. */
  itemStyle?: OutlineItemStyle;
  /** An outlined point's marker shape, so its status doesn't rest on colour alone. */
  symbol?: 'triangle';
}

/** Maps a bubble point's raw size value to its marker's pixel diameter; a missing value falls back to a default. */
export type SizeScale = (size: number | null | undefined) => number;

export interface ScatterTooltipParams {
  value: [Coord, Coord];
  seriesName: string;
  seriesIndex: number;
  data: ScatterPoint;
}

/** A point on the chart a comment is pinned to — just enough to place and re-identify its marker. */
export interface ChartCommentAnchor {
  x: number;
  y: number;
  yAxisIndex?: number;
}

/** The series `name` every comment-anchor marker series shares, so a click handler can tell them apart from real data. */
export const COMMENT_ANCHOR_SERIES_NAME = '__commentAnchors';

/** A comment-anchor marker's data item — the echarts click event hands this back as `params.data`. */
export interface CommentAnchorPoint {
  value: [number, number];
  anchor: ChartCommentAnchor;
}

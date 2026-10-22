import { ChartAxis } from './chart-axis.model';
import { LineDashStyle } from './line-dash-style.model';
import { LineDirection } from './line-direction.model';

/**
 * A single dashed line drawn at a fixed value on an axis, captioned with a short label —
 * the lightweight alternative to a {@link ChartToleranceBand} for marking a target, a cap,
 * or any other fixed point that doesn't need resolving against a separate dataset row.
 */
export type ChartGuideLine = {
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
};

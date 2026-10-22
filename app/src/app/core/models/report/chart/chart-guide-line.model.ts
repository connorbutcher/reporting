import { ChartAxis } from './chart-axis.model';
import { LineDashStyle } from './line-dash-style.model';
import { LineDirection } from './line-direction.model';

/** A labelled line, or shaded range, at a fixed axis value. */
export type ChartGuideLine = {
  /** Client-generated; not meaningful server-side. */
  id: string;
  axis: ChartAxis;
  /** The {@link ChartValueAxis.id} a `y` line uses; unknown or null uses the primary. */
  yAxisId?: string | null;
  value: number;
  /** Null draws a line rather than a range. */
  valueTo?: number | null;
  /** Blank shows the formatted value. */
  label: string;
  color?: string | null;
  dashStyle?: LineDashStyle | null;
  fill?: boolean;
  outlinePoints?: boolean;
  /** Single lines only: which side is out of range; defaults to `above`. */
  direction?: LineDirection | null;
};

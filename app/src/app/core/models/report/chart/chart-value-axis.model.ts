import { AxisSide } from './axis-side.model';
import { AxisLabelRotation } from './axis-label-rotation.model';

/**
 * One value (Y) axis a chart plots against. A chart always has at least the
 * primary axis (the first in {@link ChartWidgetConfigBase.yAxes}); adding more
 * lets overlaid datasets with different scales each get a readable axis — the
 * echarts multi-axis / dual-axis chart. Only point charts (scatter, line) use
 * more than one; a bar chart has a single value axis.
 */
export type ChartValueAxis = {
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
};

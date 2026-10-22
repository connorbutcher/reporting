import { AxisSide } from './axis-side.model';
import { AxisLabelRotation } from './axis-label-rotation.model';

/** A value axis. Point charts can have several; other charts use only the primary. */
export type ChartValueAxis = {
  /** Client-generated; referenced by {@link ChartSeriesBinding.yAxisId}. */
  id: string;
  label: string;
  side: AxisSide;
  /** Null auto-fits. This and the options below are ignored on a category axis. */
  min?: number | null;
  max?: number | null;
  logScale?: boolean;
  interval?: number | null;
  rotate?: AxisLabelRotation;
  scale?: boolean;
};

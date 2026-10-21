/**
 * The tick-label fields the scale fragments set. echarts types `axisLabel` per axis kind, so this
 * shape is the one assignable to all of them.
 */
export interface AxisLabelFormatting {
  formatter?: (value: number | string, index?: number) => string;
  rotate?: number;
  /** Category axes only: how many labels to skip between shown ones (`0` shows every label). */
  interval?: number;
}

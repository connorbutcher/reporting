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

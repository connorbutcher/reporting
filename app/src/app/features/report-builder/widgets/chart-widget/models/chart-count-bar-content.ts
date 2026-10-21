/** What the count bar under a chart shows. */
export interface ChartCountBarContent {
  label: string;
  /** The PrimeIcons class beside the label. */
  icon: string;
  /** The chart is showing less than it should — draws the eye. */
  warning: boolean;
}

/** What each chart in a control chart mode, and the value it plots, is called. */
export type ControlChartNames = {
  /** The top chart's plotted value (Mean, Value, Proportion defective, ...). */
  value: string;
  /** The bottom chart's plotted value (Range, Std dev, Moving range); empty for attribute charts. */
  dispersion: string;
  meanChart: string;
  dispersionChart: string;
};

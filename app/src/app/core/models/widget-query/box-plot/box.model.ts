/** One category's box summary for a series. */
export type Box = {
  /** The lower whisker end: the actual minimum, or the smallest value inside the lower fence. */
  min: number;
  q1: number;
  median: number;
  q3: number;
  /** The upper whisker end: the actual maximum, or the largest value inside the upper fence. */
  max: number;
  /** The arithmetic mean, for the mean marker and performance (Pp/Ppk). */
  mean: number;
  /** The sample standard deviation (n−1); 0 for a single value. */
  stdDev: number;
  /** How many rows fed this box. */
  count: number;
  /** A capped sample of the raw values behind this box, for the jittered overlay. Empty unless requested. */
  points: number[];
  /** Each tooltip column's average over this box's rows, formatted. */
  tooltipLines?: string[];
};

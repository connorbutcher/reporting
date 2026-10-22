/** A linear fit: endpoints at the series' min and max X, plus slope, intercept and R². */
export type TrendLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
  intercept: number;
  /** The coefficient of determination (0..1) — how well the line fits the series' points. */
  rSquared: number;
};

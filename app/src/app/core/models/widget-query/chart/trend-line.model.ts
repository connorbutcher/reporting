/**
 * A series' linear trend: the two endpoints to draw a line through (its fitted Y at the series'
 * min and max X), plus the fit's slope/intercept/R² should the client want to show them.
 */
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

/** A single value beyond a Tukey whisker, tagged with the category slot it belongs to. */
export type BoxOutlier = {
  /** Index into {@link BoxPlotQueryResult.categories} — the box this point sits above. */
  categoryIndex: number;
  value: number;
};

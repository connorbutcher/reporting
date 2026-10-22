/**
 * One subgroup's mean and range, plus the control limits it's judged against — carried per
 * subgroup rather than once for the whole chart, since they vary with that subgroup's own sample
 * size when subgroup sizes aren't all equal.
 */
export type XBarRSubgroup = {
  mean: number;
  range: number;
  /** How many rows fed this subgroup. */
  count: number;
  /** False for a subgroup of one, or the first individual (no moving range yet). */
  hasRange?: boolean;
  xBarUcl: number;
  xBarLcl: number;
  rUcl: number;
  rLcl: number;
  /** Whether this subgroup's mean falls outside its own X-bar control limits. */
  meanOutOfControl: boolean;
  /** Whether this subgroup's range falls outside its own R control limits. */
  rangeOutOfControl: boolean;
  /** Nelson rules (1–5) broken on the mean/value chart. */
  meanRules?: number[];
  /** Nelson rules broken on the range/σ/moving-range chart. */
  rangeRules?: number[];
};

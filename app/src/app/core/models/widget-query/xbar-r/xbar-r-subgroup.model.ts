/** A subgroup's mean and range with its own limits, which vary with sample size. */
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

export type ConditionFacts = {
  readonly columnMissing: boolean;
  /** A tolerance operator on a column that has no banding. */
  readonly toleranceMissing: boolean;
  readonly complete: boolean;
  readonly columnName: string | null;
  readonly operatorLabel: string;
  readonly needed: number;
};

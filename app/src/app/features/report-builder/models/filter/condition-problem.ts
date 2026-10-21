/** Why an enabled condition isn't narrowing the data. Only the first that applies is reported. */
export type ConditionProblem =
  | { kind: 'missingColumn' }
  | { kind: 'missingTolerance'; columnName: string | null }
  | { kind: 'missingValue'; columnName: string | null; operatorLabel: string; needed: number };

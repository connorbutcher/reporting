/** A sort the reader chose by clicking a header, or the report's saved default. */
export type PivotSort =
  | { kind: 'measure'; index: number; descending: boolean }
  | { kind: 'field'; index: number; descending: boolean };

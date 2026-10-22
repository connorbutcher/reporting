/**
 * Picks each data row's limits row where {@link sourceColumnId} equals {@link columnId}. Unmatched rows
 * aren't highlighted.
 */
export type ToleranceMatch = {
  /** A column of the table's own dataset whose value identifies the row's spec. */
  columnId: string;
  /** The column of the limits dataset holding the same identifier. */
  sourceColumnId: string;
};

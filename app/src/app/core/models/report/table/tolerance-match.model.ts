/**
 * Opt-in: pick each data row's limits row by value. The limits row used is the one whose
 * {@link sourceColumnId} equals the data row's {@link columnId} (text ignoring case and spaces,
 * numbers by value). A row with no match isn't highlighted.
 */
export type ToleranceMatch = {
  /** A column of the table's own dataset whose value identifies the row's spec. */
  columnId: string;
  /** The column of the limits dataset holding the same identifier. */
  sourceColumnId: string;
};

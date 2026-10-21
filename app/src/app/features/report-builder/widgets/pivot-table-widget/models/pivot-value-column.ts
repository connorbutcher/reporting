/**
 * One rendered value column: a measure within a block. A block is one column-field combination, or
 * the row totals; without column fields there is a single block.
 */
export interface PivotValueColumn {
  label: string;
  /** The measure's position in the widget's configured measures (what a sort request names). */
  measureIndex: number;
  /** Which block it belongs to: a column-key index, or null for the totals (or only) block. */
  columnKeyIndex: number | null;
  /** Its position in each row's `values`. */
  valueIndex: number;
}

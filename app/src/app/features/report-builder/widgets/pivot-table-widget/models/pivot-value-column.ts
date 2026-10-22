/** A measure within a block: one column-field combination, or the row totals. */
export type PivotValueColumn = {
  label: string;
  /** Position in the configured measures, which sort requests name. */
  measureIndex: number;
  /** A column-key index, or null for the totals (or only) block. */
  columnKeyIndex: number | null;
  /** Position in each row's `values`. */
  valueIndex: number;
};

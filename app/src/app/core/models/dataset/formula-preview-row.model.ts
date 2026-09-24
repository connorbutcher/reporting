export interface FormulaPreviewRow {
  rowId: string;
  /** The computed value in the column's canonical text form; null when blank. */
  value: string | null;
  error: string | null;
  /** What the row holds in each column the formula reads, by column name; null when blank. */
  inputs: Record<string, string | null>;
}

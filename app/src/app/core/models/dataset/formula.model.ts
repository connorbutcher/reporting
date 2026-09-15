import { DatasetColumnType } from './schema.model';

/** Creates or edits a formula column: its declared result type and its expression text. */
export interface SaveFormulaColumn {
  name: string;
  resultType: DatasetColumnType;
  expression: string;
}

/** One sampled row's result in a formula preview — either a value or an error, never both. */
export interface FormulaPreviewRow {
  rowId: string;
  /** Formatted the same way a real cell value is; undefined if this row errored. */
  value?: string;
  error?: string;
}

/**
 * The result of evaluating a not-yet-saved formula against a sample of a dataset's rows. When
 * {@link error} is set the formula doesn't even validate (bad syntax, an unknown column) and
 * {@link rows} is empty; otherwise {@link rows} holds one entry per sampled row.
 */
export interface FormulaPreviewResult {
  error?: string;
  rows: FormulaPreviewRow[];
}

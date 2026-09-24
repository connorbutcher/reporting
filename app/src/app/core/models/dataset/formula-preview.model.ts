import { FormulaError } from './formula-error.model';
import { FormulaPreviewRow } from './formula-preview-row.model';
import { DatasetColumnType } from './schema.model';

export interface FormulaPreview {
  isValid: boolean;
  errors: FormulaError[];
  /** The column type the formula evaluates to; null when it can't be told statically. */
  inferredType: DatasetColumnType | null;
  /** The columns the formula reads, in dataset order — the keys of each row's inputs. */
  inputColumns: string[];
  rows: FormulaPreviewRow[];
}

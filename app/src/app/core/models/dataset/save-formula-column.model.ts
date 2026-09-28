import { DatasetColumnType } from './schema.model';

/** Creates or replaces a formula column. A null type takes the type the formula produces. */
export interface SaveFormulaColumn {
  name: string;
  expression: string;
  type: DatasetColumnType | null;
}

import { DatasetColumnType } from '../schema/dataset-column-type.model';

/** Creates or replaces a formula column. A null type takes the type the formula produces. */
export type SaveFormulaColumn = {
  name: string;
  expression: string;
  type: DatasetColumnType | null;
};

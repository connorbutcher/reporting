import { DatasetColumn } from '../../../../core/models/dataset';

export interface FormulaBuilderData {
  datasetId: number;
  /** Every column of the dataset — the ones a formula may read (bar the one being edited). */
  columns: DatasetColumn[];
  /** The formula column being edited; null when adding one. */
  column: DatasetColumn | null;
}

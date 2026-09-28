import { DatasetColumn } from '../../../../core/models/dataset';
import { FormulaBuilderData } from './formula-builder-data';

/** The columns a formula may read: all of the dataset's, except the one being defined. */
export function readableColumns(data: FormulaBuilderData): DatasetColumn[] {
  return data.columns.filter((column) => column.id !== data.column?.id);
}

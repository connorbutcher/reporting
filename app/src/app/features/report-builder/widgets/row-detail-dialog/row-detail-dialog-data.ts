import { RowDetailField } from './row-detail-field';

/** What a table hands the row-detail panel: which row of which dataset, and the fields to list. */
export interface RowDetailDialogData {
  datasetId: number;
  rowId: string;
  title: string;
  /** Every dataset column, the table's own settings (header, tolerance) applied where it has them. */
  fields: RowDetailField[];
}

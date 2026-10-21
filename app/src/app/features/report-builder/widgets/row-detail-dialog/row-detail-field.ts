import { DataTableColumnSetting } from '../../../../core/models/report';

/** One field the row-detail panel lists: the column and the label to show it under. */
export interface RowDetailField {
  setting: DataTableColumnSetting;
  label: string;
}

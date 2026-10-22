import { DataTableColumnSetting } from '../../../../core/models/report';

/** One field the row-detail panel lists: the column and the label to show it under. */
export type RowDetailField = {
  setting: DataTableColumnSetting;
  label: string;
};

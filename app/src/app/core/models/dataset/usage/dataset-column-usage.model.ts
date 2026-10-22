import { ColumnUsage } from './column-usage.model';

/** Where a dataset's columns are used in the draft report that owns it; lists only columns that are used. */
export type DatasetColumnUsage = {
  columns: ColumnUsage[];
};

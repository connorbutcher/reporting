import { DatasetColumnType } from '../schema/dataset-column-type.model';
import { ColumnUse } from './column-use.model';

/** Uses that work on the current type but not the new one. */
export type ColumnTypeImpact = {
  from: DatasetColumnType;
  to: DatasetColumnType;
  breaks: ColumnUse[];
};

import { DatasetColumnType } from '../schema/dataset-column-type.model';
import { ColumnUse } from './column-use.model';

/**
 * What changing a column to another type would newly break: only uses that work on its current type
 * but not the new one. Each break's `roles` say what stops working ("Value column needs a number").
 */
export type ColumnTypeImpact = {
  from: DatasetColumnType;
  to: DatasetColumnType;
  breaks: ColumnUse[];
};

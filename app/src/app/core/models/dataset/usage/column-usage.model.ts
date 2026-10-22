import { ColumnUse } from './column-use.model';

export type ColumnUsage = {
  columnId: string;
  uses: ColumnUse[];
};

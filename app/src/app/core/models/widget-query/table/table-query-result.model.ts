import { TableRowResult } from './table-row-result.model';
import { TableCell } from './table-cell.model';
import { TableColumnStats } from './table-column-stats.model';

export type TableQueryResult = {
  id: string;
  name: string;
  rows: TableRowResult[];
  totalRowCount: number;
  matchedRowCount: number;
  /** Each column's configured total over every matched row; only columns with a total appear. */
  totals?: Record<string, TableCell>;
  /** Min/max per data-bar column over every matched row. */
  columnStats?: Record<string, TableColumnStats>;
};

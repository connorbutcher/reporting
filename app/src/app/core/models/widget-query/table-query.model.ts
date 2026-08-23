import { DataTableColumnSetting, SortDirection } from '../report';
import { FilterGroup } from '../filter';

export type ToleranceStatus = 'none' | 'pass' | 'concession' | 'fail';

export interface TableQueryRequest {
  filter: FilterGroup | null;
  sortColumnId: string | null;
  sortDirection: SortDirection;
  skip: number;
  take: number;
  columns: DataTableColumnSetting[];
}

export interface TableCell {
  displayValue: string | null;
  tolerance: ToleranceStatus;
}

export interface TableRowResult {
  id: string;
  cells: Record<string, TableCell>;
}

export interface TableQueryResult {
  id: string;
  name: string;
  rows: TableRowResult[];
  totalRowCount: number;
  matchedRowCount: number;
}

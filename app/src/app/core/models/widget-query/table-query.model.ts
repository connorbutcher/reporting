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
  /** Keeps only rows where some requested column contains this text. Blank or omitted searches nothing. */
  search?: string | null;
  /** Narrows the query to one row, for the row-detail view. */
  rowId?: string | null;
}

export interface TableCell {
  displayValue: string | null;
  /** The typed value: a number, true/false, a date as an ISO string, or text. Null for a blank cell. */
  value?: number | string | boolean | null;
  tolerance: ToleranceStatus;
}

export interface TableRowResult {
  id: string;
  cells: Record<string, TableCell>;
}

/** The range of a data-bar column over every matched row. */
export interface TableColumnStats {
  min: number | null;
  max: number | null;
}

export interface TableQueryResult {
  id: string;
  name: string;
  rows: TableRowResult[];
  totalRowCount: number;
  matchedRowCount: number;
  /** Each column's configured total over every matched row; only columns with a total appear. */
  totals?: Record<string, TableCell>;
  /** Min/max per data-bar column over every matched row. */
  columnStats?: Record<string, TableColumnStats>;
}

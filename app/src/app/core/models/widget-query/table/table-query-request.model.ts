import { FilterGroup } from '../../filter';
import { DataTableColumnSetting, SortDirection } from '../../report';

export type TableQueryRequest = {
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
};

import { WidgetConfigBase } from '../widget/widget-config-base.model';
import { TableDensity } from './table-density.model';
import { DataTableColumnSetting } from './data-table-column-setting.model';
import { SortDirection } from './sort-direction.model';
import { FilterGroup } from '../../filter';

export type DataTableWidgetConfig = WidgetConfigBase & {
  type: 'dataTable';
  /** Null until the user binds the table to a dataset. */
  datasetId: number | null;

  showColumnHeaders: boolean;

  resizableColumns: boolean;
  stripedRows: boolean;
  showGridlines: boolean;
  rowHover: boolean;
  density: TableDensity;

  paginator: boolean;
  rowsPerPage: number;

  emptyMessage: string;

  /** Shows a footer row with each column's total, over every matched row. */
  showTotals: boolean;
  /** Shows a search box readers can use to narrow the rows to those containing some text. */
  showSearch: boolean;
  /** How many leading columns stay put while the table scrolls sideways. */
  frozenColumns: number;
  /** Clicking a row opens a panel listing every column of that row. */
  rowDetails: boolean;

  /** Columns on the table, in display order. Empty shows nothing until columns are added. */
  columns: DataTableColumnSetting[];

  sortColumnId: string | null;
  sortDirection: SortDirection;

  /** Rows this widget shows, narrowed server-side. Null means no widget-level filter. */
  filter: FilterGroup | null;
};

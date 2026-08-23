import { FilterGroup } from '../filter';
import { WidgetConfigBase } from './widget-base.model';

export type SortDirection = 'asc' | 'desc';
export type ColumnAlign = 'left' | 'center' | 'right';
export type TableDensity = 'compact' | 'normal' | 'comfortable';

/** A column placed on the table, in display order. */
export interface DataTableColumnSetting {
  columnId: string;
  /** Overrides the dataset column's name in the header. */
  header?: string;
  /** Pixel width kept after the user resizes the column. */
  width?: number;
  /** Omitted falls back to right for numbers, left otherwise. */
  align?: ColumnAlign;
  sortable?: boolean;
  /** Pass/fail highlighting for this column's values. Omitted shows no banding. */
  tolerance?: ToleranceConfig;
}

/**
 * Red/amber banding for a numeric column, resolved against one row of a
 * separate limits dataset so the same spec can be reused across columns and
 * reports. Min/Max is the in-spec range; the optional concession bounds
 * widen it into an amber "needs sign-off" zone before a value goes red.
 */
export interface ToleranceConfig {
  sourceDatasetId: number;
  sourceRowId: string;
  minColumnId: string;
  maxColumnId: string;
  concessionLowerColumnId?: string;
  concessionUpperColumnId?: string;
}

export interface DataTableWidgetConfig extends WidgetConfigBase {
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

  /** Columns on the table. Empty means "every dataset column, in dataset order". */
  columns: DataTableColumnSetting[];

  sortColumnId: string | null;
  sortDirection: SortDirection;

  /** Rows this widget shows, narrowed server-side. Null means no widget-level filter. */
  filter: FilterGroup | null;
}

export const DEFAULT_TABLE_CONFIG: Omit<DataTableWidgetConfig, 'type'> = {
  datasetId: null,
  title: 'Table',
  showTitle: true,
  showColumnHeaders: true,
  resizableColumns: false,
  stripedRows: false,
  showGridlines: false,
  rowHover: true,
  density: 'compact',
  paginator: false,
  rowsPerPage: 10,
  emptyMessage: 'No rows to display.',
  columns: [],
  sortColumnId: null,
  sortDirection: 'asc',
  filter: null,
};

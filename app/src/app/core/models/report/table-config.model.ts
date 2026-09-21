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

/** The limits dataset and which of its columns hold the bounds — what every tolerance pointer carries. */
export interface ToleranceLimits {
  sourceDatasetId: number;
  minColumnId: string;
  maxColumnId: string;
  concessionLowerColumnId?: string;
  concessionUpperColumnId?: string;
}

/** Limits taken from one fixed row of the limits dataset. */
export interface FixedToleranceConfig extends ToleranceLimits {
  sourceRowId: string;
}

/**
 * Opt-in: pick each data row's limits row by value. The limits row used is the one whose
 * {@link sourceColumnId} equals the data row's {@link columnId} (text ignoring case and spaces,
 * numbers by value). A row with no match isn't highlighted.
 */
export interface ToleranceMatch {
  /** A column of the table's own dataset whose value identifies the row's spec. */
  columnId: string;
  /** The column of the limits dataset holding the same identifier. */
  sourceColumnId: string;
}

/**
 * Red/amber banding for a numeric column, resolved against a separate limits dataset so the same
 * spec can be reused across columns and reports. Min/Max is the in-spec range; the optional
 * concession bounds widen it into an amber "needs sign-off" zone before a value goes red.
 *
 * By default every value is checked against one fixed row ({@link sourceRowId}); with {@link match}
 * the row is chosen per data row instead, and there is no fixed row.
 */
export interface ToleranceConfig extends ToleranceLimits {
  sourceRowId?: string;
  match?: ToleranceMatch;
}

/**
 * Whether a column's limits are one fixed band. The tolerance filter operators ("in tolerance",
 * "needs concession"…) test against a single band, so they're only offered on such a column — not
 * on one whose limits change from row to row.
 */
export function hasFixedLimits(tolerance: ToleranceConfig | null | undefined): boolean {
  return !!tolerance && !tolerance.match;
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

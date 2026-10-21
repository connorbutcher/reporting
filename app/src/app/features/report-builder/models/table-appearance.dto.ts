import { DataTableWidgetConfig } from '../../../core/models/report';

/** The presentation options for a table, independent of which data it shows. */
export type TableAppearanceDto = Pick<
  DataTableWidgetConfig,
  | 'showColumnHeaders'
  | 'resizableColumns'
  | 'stripedRows'
  | 'showGridlines'
  | 'rowHover'
  | 'density'
  | 'paginator'
  | 'rowsPerPage'
  | 'emptyMessage'
  | 'showTotals'
  | 'showSearch'
  | 'frozenColumns'
  | 'rowDetails'
>;

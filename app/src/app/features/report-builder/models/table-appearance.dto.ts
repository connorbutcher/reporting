import { DataTableWidgetConfig } from '../../../core/models/report';

/** A table's presentation options, independent of its data. */
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

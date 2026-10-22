import { PivotFieldResult } from './pivot-field-result.model';
import { PivotMeasureColumn } from './pivot-measure-column.model';
import { PivotColumnKey } from './pivot-column-key.model';
import { PivotRow } from './pivot-row.model';

export type PivotQueryResult = {
  id: string;
  name: string;
  rowFields: PivotFieldResult[];
  columnFields?: PivotFieldResult[];
  measures: PivotMeasureColumn[];
  columnKeys?: PivotColumnKey[];
  /** True when each row ends with a block of row totals after its column groups. */
  hasRowTotals?: boolean;
  rows: PivotRow[];
  /** The totals row, when requested; null otherwise. */
  grandTotal: PivotRow | null;
  totalRowCount: number;
  matchedRowCount: number;
  /** True when only the first {@link scannedRowCount} matched rows were summarised, so every value is incomplete. */
  scanTruncated?: boolean;
  scannedRowCount?: number;
  /** True when more groups exist than are listed (totals still count them). */
  rowsTruncated?: boolean;
  /** True when more column combinations exist than are shown. */
  columnsTruncated?: boolean;
  /** True when any cap was hit. */
  truncated: boolean;
};

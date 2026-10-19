import { PivotAggregate, PivotFieldGrouping, PivotShowAs } from '../report';
import { FilterGroup } from '../filter';

/** One measure the pivot computes: an aggregate over a column (null column for `count`). */
export interface PivotMeasureRequest {
  columnId: string | null;
  aggregate: PivotAggregate;
  showAs?: PivotShowAs;
  /** Overrides the derived column header; blank uses the derived one. */
  label: string;
}

export interface PivotQueryRequest {
  filter: FilterGroup | null;
  /** The columns rows are grouped by, in order. */
  rowFields: string[];
  /** The columns spread across the top, in order. */
  columnFields?: string[];
  /** Date fields grouped by period. */
  fieldGroupings?: PivotFieldGrouping[];
  measures: PivotMeasureRequest[];
  /** Index into {@link measures} to order rows by; null orders by the dimension keys. */
  sortMeasureIndex: number | null;
  /** Index into {@link rowFields} to order rows by first; ignored while a measure sort is set. */
  sortRowFieldIndex?: number | null;
  sortDescending: boolean;
  showGrandTotal: boolean;
  showSubtotals?: boolean;
}

/** A dimension column in the result header. */
export interface PivotFieldResult {
  columnId: string;
  label: string;
}

/** A measure column in the result header — its resolved label and which measure it came from. */
export interface PivotMeasureColumn {
  /** Stable per-result key ("m0", "m1", …) naming the measure's position in the request. */
  key: string;
  label: string;
  columnId: string | null;
  aggregate: PivotAggregate;
  showAs?: PivotShowAs;
}

/** One combination of column-field values across the top. */
export interface PivotColumnKey {
  labels: string[];
  /** Conditions selecting the rows behind this column; null when they can't be expressed. */
  drill?: FilterGroup | null;
}

/** One measure's value in a row, raw and already formatted. */
export interface PivotCell {
  value: number | null;
  displayValue: string | null;
}

export interface PivotRow {
  /** Formatted dimension values, one per row field in order; empty for a total-only pivot. */
  dimensions: string[];
  /** Without column fields, one per measure; with them, a block of measures per column key, then the row totals. */
  values: PivotCell[];
  isGrandTotal: boolean;
  /** A subtotal row heading an outer group. */
  isSubtotal?: boolean;
  /** How many row fields the row is grouped by: all of them for a detail row, fewer for a subtotal. */
  depth?: number;
  /** Conditions selecting the rows behind this row; null when they can't be expressed. */
  drill?: FilterGroup | null;
}

export interface PivotQueryResult {
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
}

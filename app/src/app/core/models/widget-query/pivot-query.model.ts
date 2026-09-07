import { Aggregate } from '../report';
import { FilterGroup } from '../filter';

/** One measure the pivot computes: an aggregate over a column (null column for `count`). */
export interface PivotMeasureRequest {
  columnId: string | null;
  aggregate: Aggregate;
  /** Overrides the derived column header; blank uses the derived one. */
  label: string;
}

export interface PivotQueryRequest {
  filter: FilterGroup | null;
  /** The columns rows are grouped by, in order. */
  rowFields: string[];
  measures: PivotMeasureRequest[];
  /** Index into {@link measures} to order rows by; null orders by the dimension keys. */
  sortMeasureIndex: number | null;
  sortDescending: boolean;
  showGrandTotal: boolean;
}

/** A dimension column in the result header. */
export interface PivotFieldResult {
  columnId: string;
  label: string;
}

/** A measure column in the result header — its resolved label and which measure it came from. */
export interface PivotMeasureColumn {
  /** Stable per-result key ("m0", "m1", …), matching the order of {@link PivotRow.values}. */
  key: string;
  label: string;
  columnId: string | null;
  aggregate: Aggregate;
}

/** One measure's value in a row, raw and already formatted. */
export interface PivotCell {
  value: number | null;
  displayValue: string | null;
}

export interface PivotRow {
  /** Formatted dimension values, one per row field in order; empty for a total-only pivot. */
  dimensions: string[];
  /** One entry per measure, in order. */
  values: PivotCell[];
  isGrandTotal: boolean;
}

export interface PivotQueryResult {
  id: string;
  name: string;
  rowFields: PivotFieldResult[];
  measures: PivotMeasureColumn[];
  rows: PivotRow[];
  /** The totals row, when requested; null otherwise. */
  grandTotal: PivotRow | null;
  totalRowCount: number;
  matchedRowCount: number;
  /** True when the scan or the group count hit its cap. */
  truncated: boolean;
}

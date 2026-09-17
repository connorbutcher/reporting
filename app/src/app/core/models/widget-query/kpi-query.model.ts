import { Aggregate } from '../report';
import { FilterGroup } from '../filter';
import { NumericColumnConfig } from '../dataset';

export interface KpiMeasureRequest {
  /** The name the formula references this measure by, e.g. `[OverLimit]`. */
  alias: string;
  /** The column reduced; null for `count`. */
  columnId: string | null;
  aggregate: Aggregate;
  /** Narrows the rows this one measure reduces, ANDed with the query's active filter. */
  filter: FilterGroup | null;
}

export interface KpiThresholdRequest {
  lowerBound: number | null;
  upperBound: number | null;
  invertColors: boolean;
}

export interface KpiQueryRequest {
  filter: FilterGroup | null;
  measures: KpiMeasureRequest[];
  /** An expression over the measures' aliases; blank defaults to the sole measure's value. */
  formula: string;
  /** When set, the value is computed a second time with this filter instead of `filter`. */
  comparisonFilter: FilterGroup | null;
  numberFormat: NumericColumnConfig | null;
  threshold: KpiThresholdRequest | null;
}

/** Where a KPI value falls against its configured threshold, for the tile's coloring. */
export type KpiStatus = 'neutral' | 'good' | 'bad';

export interface KpiQueryResult {
  /** The formula's result over the active filter; null when nothing matched or the formula errored. */
  value: number | null;
  formattedValue: string | null;
  /** The same computation over the comparison filter, when one was supplied. */
  comparisonValue: number | null;
  formattedComparisonValue: string | null;
  /** `value` minus `comparisonValue`; null unless both are present. */
  delta: number | null;
  /** `delta` as a percentage of the comparison value; null if that value is zero or absent. */
  deltaPercent: number | null;
  status: KpiStatus;
  /** An unknown alias, a formula parse error, or a runtime evaluation error (e.g. divide by zero). */
  error: string | null;
  totalRowCount: number;
  matchedRowCount: number;
  truncated: boolean;
}

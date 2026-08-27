export type FilterJoin = 'and' | 'or';

export type FilterOperator =
  // every type
  | 'equals'
  | 'notEquals'
  | 'isEmpty'
  | 'isNotEmpty'
  // string
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  // numeric and date
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  // bool
  | 'isTrue'
  | 'isFalse'
  // date, relative to today
  | 'inLastDays'
  | 'inNextDays'
  // numeric, against the column's configured tolerance banding — no operand, the
  // bounds come from the banding, resolved server-side at query time.
  | 'inTolerance'
  | 'needsConcession'
  | 'outOfTolerance';

/** What the panel renders for an operator's operands. */
export type FilterOperandKind = 'none' | 'text' | 'number' | 'date' | 'list';

/**
 * The operators that test a value against its column's configured tolerance banding.
 * They take no operand and are only offerable on a numeric column that has banding —
 * the filter panel hides them elsewhere, and the server resolves the bounds at query time.
 */
export const TOLERANCE_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'inTolerance',
  'needsConcession',
  'outOfTolerance',
]);

export interface FilterCondition {
  kind: 'condition';
  columnId: string;
  operator: FilterOperator;
  /** 0, 1 or 2 raw strings, parsed server-side against the column's type. */
  values: string[];
  /**
   * Whether this condition narrows the data. Omitted means enabled — so filters
   * saved before this existed still apply. A disabled condition is kept (in the
   * report and the viewer) but not applied, letting a reader toggle it on and off.
   */
  enabled?: boolean;
}

export interface FilterGroup {
  kind: 'group';
  join: FilterJoin;
  children: FilterNode[];
}

export type FilterNode = FilterGroup | FilterCondition;

/** A report-level filter, applied to every widget bound to that dataset. */
export interface ReportFilter {
  datasetId: number;
  filter: FilterGroup;
}

export interface DatasetQueryResult {
  id: number;
  name: string;
  rows: { id: string; values: Record<string, string> }[];
  totalRowCount: number;
  matchedRowCount: number;
}

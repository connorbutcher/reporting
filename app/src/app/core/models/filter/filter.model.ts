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
  | 'inNextDays';

/** What the panel renders for an operator's operands. */
export type FilterOperandKind = 'none' | 'text' | 'number' | 'date' | 'list';

export interface FilterCondition {
  kind: 'condition';
  columnId: string;
  operator: FilterOperator;
  /** 0, 1 or 2 raw strings, parsed server-side against the column's type. */
  values: string[];
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

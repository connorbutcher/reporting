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
  // numeric, against the column's tolerance banding: no operand, bounds resolved server-side
  | 'inTolerance'
  | 'needsConcession'
  | 'outOfTolerance';

/** What the panel renders for an operator's operands. */
export type FilterOperandKind = 'none' | 'text' | 'number' | 'date' | 'list';

/** Operators that test a value against its column's tolerance banding: no operand, and only offered on a banded numeric column. */
export const TOLERANCE_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'inTolerance',
  'needsConcession',
  'outOfTolerance',
]);

export type FilterCondition = {
  kind: 'condition';
  columnId: string;
  operator: FilterOperator;
  /** 0, 1 or 2 raw strings, parsed server-side against the column's type. */
  values: string[];
  /** Omitted means enabled, so older filters still apply. A disabled condition is kept but not applied. */
  enabled?: boolean;
};

export type FilterGroup = {
  kind: 'group';
  join: FilterJoin;
  children: FilterNode[];
};

export type FilterNode = FilterGroup | FilterCondition;

/** Applies to every widget bound to the dataset. */
export type ReportFilter = {
  datasetId: number;
  filter: FilterGroup;
};

export type DatasetQueryResult = {
  id: number;
  name: string;
  rows: { id: string; values: Record<string, string> }[];
  totalRowCount: number;
  matchedRowCount: number;
};

/** Just the counts, for the live "matches N of M" readout. */
export type DatasetCountResult = {
  totalRowCount: number;
  matchedRowCount: number;
};

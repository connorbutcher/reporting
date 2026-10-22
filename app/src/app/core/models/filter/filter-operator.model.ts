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

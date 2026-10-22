/** How a conditional-format rule compares a cell's value to its operands. */
export type FormatRuleOperator =
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'equals'
  | 'notEquals'
  | 'between'
  | 'contains'
  | 'isEmpty';

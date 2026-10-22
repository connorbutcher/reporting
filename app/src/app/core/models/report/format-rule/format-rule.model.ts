import { FormatRuleOperator } from './format-rule-operator.model';
import { FormatRuleStyle } from './format-rule-style.model';

/**
 * One conditional-format rule on a table column or pivot measure: a cell whose value satisfies
 * `operator` against `value` (and `value2` for between) takes `style`. Rules are checked in order and
 * the first match wins; they're evaluated client-side against each cell's raw value.
 */
export type FormatRule = {
  operator: FormatRuleOperator;
  value: string;
  value2?: string | null;
  style: FormatRuleStyle;
};

import { FormatRuleOperator } from './format-rule-operator.model';
import { FormatRuleStyle } from './format-rule-style.model';

/** A conditional format applied client-side; rules are checked in order and the first match wins. */
export type FormatRule = {
  operator: FormatRuleOperator;
  value: string;
  value2?: string | null;
  style: FormatRuleStyle;
};

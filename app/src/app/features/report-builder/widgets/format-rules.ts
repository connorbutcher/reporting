import { FormatRule, FormatRuleStyle } from '../../../core/models/report';

/** The CSS class each rule style puts on a cell; the classes live in `_cell-format.scss`. */
export const FORMAT_STYLE_CLASS: Record<FormatRuleStyle, string> = {
  red: 'fmt-red',
  amber: 'fmt-amber',
  green: 'fmt-green',
  blue: 'fmt-blue',
  bold: 'fmt-bold',
};

/** A raw cell value as the table and pivot queries return it: a number, true/false, an ISO date, or text. */
export type RawCellValue = number | string | boolean | null | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/** The style of the first rule `value` satisfies, or null when none does (or there are no rules). */
export function matchFormatRule(value: RawCellValue, rules: readonly FormatRule[] | null | undefined): FormatRuleStyle | null {
  for (const rule of rules ?? []) {
    if (ruleMatches(value, rule)) return rule.style;
  }
  return null;
}

/** Whether one rule holds for a value. Numbers and dates compare by value; anything else as text, ignoring case. */
export function ruleMatches(value: RawCellValue, rule: FormatRule): boolean {
  const blank = value === null || value === undefined || value === '';
  if (rule.operator === 'isEmpty') return blank;
  if (blank) return false;

  if (rule.operator === 'contains') {
    return String(value).toLowerCase().includes(rule.value.trim().toLowerCase());
  }

  const left = comparable(value);
  const right = operand(rule.value, left.kind);
  if (right === null) return false;

  switch (rule.operator) {
    case 'equals':
      return compare(left.v, right) === 0;
    case 'notEquals':
      return compare(left.v, right) !== 0;
  }

  // Ordering operators only mean something for numbers and dates.
  if (left.kind === 'text') return false;
  const order = compare(left.v, right);
  switch (rule.operator) {
    case 'greaterThan':
      return order > 0;
    case 'greaterThanOrEqual':
      return order >= 0;
    case 'lessThan':
      return order < 0;
    case 'lessThanOrEqual':
      return order <= 0;
    case 'between': {
      const other = operand(rule.value2 ?? '', left.kind);
      if (other === null) return false;
      const [low, high] = right <= other ? [right, other] : [other, right];
      return compare(left.v, low) >= 0 && compare(left.v, high) <= 0;
    }
    default:
      return false;
  }
}

/**
 * How far along its bar a value sits, as a percentage of the column's range, which always includes
 * zero so bars grow from a common baseline. Null when the value or range isn't numeric.
 */
export function dataBarPercent(value: RawCellValue, min: number | null | undefined, max: number | null | undefined): number | null {
  if (typeof value !== 'number' || min === null || min === undefined || max === null || max === undefined) return null;
  const low = Math.min(0, min);
  const high = Math.max(0, max);
  if (high === low) return null;
  return Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
}

type ValueKind = 'number' | 'date' | 'text';

/** A value in a form that compares by meaning: a number, a date as its time, or lower-cased text. */
function comparable(value: Exclude<RawCellValue, null | undefined>): { kind: ValueKind; v: number | string } {
  if (typeof value === 'number') return { kind: 'number', v: value };
  if (typeof value === 'boolean') return { kind: 'text', v: value ? 'true' : 'false' };
  if (ISO_DATE.test(value)) {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return { kind: 'date', v: time };
  }
  return { kind: 'text', v: value.toLowerCase() };
}

/** A rule operand read the same way as the value it's compared to; null when it can't be. */
function operand(raw: string, kind: ValueKind): number | string | null {
  const text = raw.trim();
  if (kind === 'text') return text.toLowerCase();
  if (text === '') return null;
  const parsed = kind === 'number' ? Number(text) : Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function compare(left: number | string, right: number | string): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

import { FormatRule, FormatRuleStyle } from '../../../../core/models/report';
import { RawCellValue } from './raw-cell-value';
import { ValueKind } from './value-kind';

export class FormatRules {
  /** The CSS class per rule style; the classes live in `_cell-format.scss`. */
  public static readonly STYLE_CLASS: Record<FormatRuleStyle, string> = {
    red: 'fmt-red',
    amber: 'fmt-amber',
    green: 'fmt-green',
    blue: 'fmt-blue',
    bold: 'fmt-bold',
  };

  private static readonly ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

  /** The style of the first rule `value` satisfies, or null. */
  public static match(
    value: RawCellValue,
    rules: readonly FormatRule[] | null | undefined,
  ): FormatRuleStyle | null {
    for (const rule of rules ?? []) {
      if (FormatRules.ruleMatches(value, rule)) return rule.style;
    }
    return null;
  }

  /** Numbers and dates compare by value; anything else as case-insensitive text. */
  public static ruleMatches(value: RawCellValue, rule: FormatRule): boolean {
    const blank = value === null || value === undefined || value === '';
    if (rule.operator === 'isEmpty') return blank;
    if (blank) return false;

    if (rule.operator === 'contains') {
      return String(value).toLowerCase().includes(rule.value.trim().toLowerCase());
    }

    const left = FormatRules.comparable(value);
    const right = FormatRules.operand(rule.value, left.kind);
    if (right === null) return false;

    switch (rule.operator) {
      case 'equals':
        return FormatRules.compare(left.v, right) === 0;
      case 'notEquals':
        return FormatRules.compare(left.v, right) !== 0;
    }

    if (left.kind === 'text') return false;
    const order = FormatRules.compare(left.v, right);
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
        const other = FormatRules.operand(rule.value2 ?? '', left.kind);
        if (other === null) return false;
        const [low, high] = right <= other ? [right, other] : [other, right];
        return FormatRules.compare(left.v, low) >= 0 && FormatRules.compare(left.v, high) <= 0;
      }
      default:
        return false;
    }
  }

  /** A value's bar length as a percentage of a range that always includes zero; null if not numeric. */
  public static dataBarPercent(
    value: RawCellValue,
    min: number | null | undefined,
    max: number | null | undefined,
  ): number | null {
    if (
      typeof value !== 'number' ||
      min === null ||
      min === undefined ||
      max === null ||
      max === undefined
    )
      return null;
    const low = Math.min(0, min);
    const high = Math.max(0, max);
    if (high === low) return null;
    return Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
  }

  private static comparable(value: Exclude<RawCellValue, null | undefined>): {
    kind: ValueKind;
    v: number | string;
  } {
    if (typeof value === 'number') return { kind: 'number', v: value };
    if (typeof value === 'boolean') return { kind: 'text', v: value ? 'true' : 'false' };
    if (FormatRules.ISO_DATE.test(value)) {
      const time = Date.parse(value);
      if (!Number.isNaN(time)) return { kind: 'date', v: time };
    }
    return { kind: 'text', v: value.toLowerCase() };
  }

  private static operand(raw: string, kind: ValueKind): number | string | null {
    const text = raw.trim();
    if (kind === 'text') return text.toLowerCase();
    if (text === '') return null;
    const parsed = kind === 'number' ? Number(text) : Date.parse(text);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private static compare(left: number | string, right: number | string): number {
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    return String(left).localeCompare(String(right));
  }
}

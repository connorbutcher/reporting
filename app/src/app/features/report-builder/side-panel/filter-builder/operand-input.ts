import { DatasetColumnType } from '../../../../core/models/dataset';
import { FilterOperator, OperatorDescriptor } from '../../../../core/models/filter';

/** How a filter condition's operand input looks and behaves. */
export class OperandInput {
  /** Text operators whose operand is one of the column's values, so are picked rather than typed. */
  private static readonly VALUE_LIST_OPERATORS: ReadonlySet<FilterOperator> =
    new Set<FilterOperator>(['equals', 'notEquals', 'in']);

  public static usesValueList(
    type: DatasetColumnType | undefined,
    operator: FilterOperator,
  ): boolean {
    return type === 'string' && OperandInput.VALUE_LIST_OPERATORS.has(operator);
  }

  /** The native input type that best fits an operand. */
  public static inputType(descriptor: OperatorDescriptor | null): 'number' | 'date' | 'text' {
    switch (descriptor?.operandKind) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  }

  public static placeholder(descriptor: OperatorDescriptor | null, index: number): string {
    if (descriptor?.operandKind === 'list') return 'value, value, …';
    if (descriptor?.operandCount === 2) return index === 0 ? 'from' : 'to';
    return 'value';
  }

  /** Dates round-trip as ISO strings, but a date input wants yyyy-MM-dd. */
  public static displayValue(descriptor: OperatorDescriptor | null, raw: string): string {
    if (descriptor?.operandKind !== 'date' || !raw) return raw;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
  }
}

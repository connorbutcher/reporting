import { DatasetColumnType } from '../../../../core/models/dataset';
import { FilterOperator, OperatorDescriptor } from '../../../../core/models/filter';

/** Text operators whose operand is one of the column's values, so are picked rather than typed. */
const VALUE_LIST_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>(['equals', 'notEquals', 'in']);

export function usesValueList(type: DatasetColumnType | undefined, operator: FilterOperator): boolean {
  return type === 'string' && VALUE_LIST_OPERATORS.has(operator);
}

/** The native input type that best fits an operand. */
export function operandInputType(descriptor: OperatorDescriptor | null): 'number' | 'date' | 'text' {
  switch (descriptor?.operandKind) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
}

export function operandPlaceholder(descriptor: OperatorDescriptor | null, index: number): string {
  if (descriptor?.operandKind === 'list') return 'value, value, …';
  if (descriptor?.operandCount === 2) return index === 0 ? 'from' : 'to';
  return 'value';
}

/** Dates round-trip as ISO strings, but a date input wants yyyy-MM-dd. */
export function operandDisplayValue(descriptor: OperatorDescriptor | null, raw: string): string {
  if (descriptor?.operandKind !== 'date' || !raw) return raw;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

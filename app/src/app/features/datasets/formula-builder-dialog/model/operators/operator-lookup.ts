import { OperatorDefinition } from './operator-definition';
import { OPERATORS } from './operators';

export function operatorDefinition(op: string): OperatorDefinition | undefined {
  return OPERATORS.find((o) => o.op === op);
}

/** Whether an operator can take a single value on its right instead of one on each side. */
export function canBePrefix(op: string): boolean {
  return op === 'NOT' || op === '-';
}

/** The operator as the builder shows it (`*` shows as ×). */
export function operatorSymbol(op: string): string {
  return operatorDefinition(op)?.symbol ?? op;
}

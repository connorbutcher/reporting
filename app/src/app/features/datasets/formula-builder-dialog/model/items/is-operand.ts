import { FormulaItem } from './formula-item';
import { OperandItem } from './operand-item';

export function isOperand(item: FormulaItem): item is OperandItem {
  return item.kind !== 'operator';
}

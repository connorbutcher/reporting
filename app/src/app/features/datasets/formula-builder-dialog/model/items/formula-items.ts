import { ExpressionAddress } from './expression-address';
import { FormulaItem } from './formula-item';
import { OperandItem } from './operand-item';

export class FormulaItems {
  /** The address of the formula's own, outermost expression. */
  public static readonly ROOT: ExpressionAddress = { ownerId: null, arg: 0 };

  public static isOperand(item: FormulaItem): item is OperandItem {
    return item.kind !== 'operator';
  }
}

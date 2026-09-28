import { OperandItem } from '../items/operand-item';
import { OperatorItem } from '../items/operator-item';

/** How to combine RPN tokens into a `T` — a kind, a tree, text. */
export interface RpnFolder<T> {
  operand(item: OperandItem): T;
  missing(operatorId: number | null): T;
  unary(operator: OperatorItem, argument: T): T;
  binary(operator: OperatorItem, left: T, right: T): T;
}

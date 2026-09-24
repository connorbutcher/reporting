import { OperandItem } from '../items/operand-item';
import { OperatorItem } from '../items/operator-item';

/** A node of the tree that reverse Polish notation builds from a sequence. */
export type RpnNode =
  | { type: 'operand'; item: OperandItem }
  | { type: 'missing'; operatorId: number | null }
  | { type: 'unary'; operator: OperatorItem; argument: RpnNode }
  | { type: 'binary'; operator: OperatorItem; left: RpnNode; right: RpnNode };

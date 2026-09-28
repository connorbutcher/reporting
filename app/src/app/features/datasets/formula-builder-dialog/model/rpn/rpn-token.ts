import { OperandItem } from '../items/operand-item';
import { OperatorItem } from '../items/operator-item';

/** One token of the reverse Polish form. A `missing` operand stands in for a value the user hasn't put down yet. */
export type RpnToken =
  | { type: 'operand'; item: OperandItem }
  | { type: 'missing'; operatorId: number | null }
  | { type: 'operator'; item: OperatorItem; unary: boolean };

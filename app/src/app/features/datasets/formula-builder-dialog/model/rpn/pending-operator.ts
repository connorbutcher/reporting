import { OperatorItem } from '../items/operator-item';

/** An operator waiting on the shunting-yard stack for its right-hand side. */
export type PendingOperator = {
  item: OperatorItem;
  unary: boolean;
  precedence: number;
};

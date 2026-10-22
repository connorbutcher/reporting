import { ExpressionAddress } from '../model';

/** Where the drag in progress would land: an expression, and the place in it. */
export type DropPoint = {
  address: ExpressionAddress;
  index: number;
};

import { ExpressionAddress } from '../items/expression-address';
import { FormulaItem } from '../items/formula-item';

/** Where an item sits: the expression it is in, and its place in it. */
export type ItemLocation = {
  item: FormulaItem;
  address: ExpressionAddress;
  index: number;
};

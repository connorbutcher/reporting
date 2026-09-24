import { ExpressionAddress } from '../items/expression-address';
import { FormulaItem } from '../items/formula-item';

/** A selection of items that all sit in one expression. */
export interface SelectionRange {
  address: ExpressionAddress;
  /** The selected items, in the order they appear. */
  items: FormulaItem[];
  /** Where the first one is in its expression. */
  start: number;
  /** Whether they are next to each other, so they can be wrapped as one. */
  contiguous: boolean;
}

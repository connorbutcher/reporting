import { Expression } from '../items/expression';
import { ExpressionAddress } from '../items/expression-address';
import { childExpressions } from './child-expressions';
import { findItem } from './find-item';

/** The expression at `address`, or null when the item that owned it is gone. */
export function expressionAt(root: Expression, address: ExpressionAddress): Expression | null {
  if (address.ownerId === null) {
    return root;
  }

  const owner = findItem(root, address.ownerId)?.item;
  return owner ? (childExpressions(owner)[address.arg] ?? null) : null;
}

import { Expression } from '../items/expression';
import { changeExpression } from './change-expression';
import { findItem } from './find-item';

/** Takes an item out of wherever it is. */
export function removeItem(root: Expression, id: number): Expression {
  const found = findItem(root, id);
  if (!found) {
    return root;
  }

  return changeExpression(root, found.address, (expression) => expression.filter((item) => item.id !== id));
}

/** Takes several items out, wherever they are. */
export function removeItems(root: Expression, ids: readonly number[]): Expression {
  let next = root;
  for (const id of ids) {
    next = removeItem(next, id);
  }

  return next;
}

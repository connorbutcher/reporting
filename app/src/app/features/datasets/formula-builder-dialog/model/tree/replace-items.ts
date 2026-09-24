import { Expression } from '../items/expression';
import { ExpressionAddress } from '../items/expression-address';
import { FormulaItem } from '../items/formula-item';
import { changeExpression } from './change-expression';
import { findItem } from './find-item';

/** Replaces `count` items from `start` in the expression at `address` with `replacement`. */
export function replaceItems(
  root: Expression,
  address: ExpressionAddress,
  start: number,
  count: number,
  replacement: readonly FormulaItem[],
): Expression {
  return changeExpression(root, address, (expression) => {
    return [...expression.slice(0, start), ...replacement, ...expression.slice(start + count)];
  });
}

/** Puts `items` into the expression at `address`, before the item at `index` (or at the end). */
export function insertItems(root: Expression, address: ExpressionAddress, index: number, items: readonly FormulaItem[]): Expression {
  return replaceItems(root, address, Math.max(0, index), 0, items);
}

/** Puts `item` into the expression at `address`, before the item currently at `index` (or at the end). */
export function insertItem(root: Expression, address: ExpressionAddress, index: number, item: FormulaItem): Expression {
  return changeExpression(root, address, (expression) => {
    const at = Math.min(Math.max(index, 0), expression.length);
    return [...expression.slice(0, at), item, ...expression.slice(at)];
  });
}

/** Dissolves a group, leaving what was inside it in its place. */
export function unwrapGroup(root: Expression, groupId: number): Expression {
  const found = findItem(root, groupId);
  if (found?.item.kind !== 'group') {
    return root;
  }

  return replaceItems(root, found.address, found.index, 1, found.item.body);
}

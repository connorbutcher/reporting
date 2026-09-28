import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { changeExpression } from './change-expression';
import { findItem } from './find-item';

/** Replaces the item with `id` by the result of `change`. */
export function updateItem(root: Expression, id: number, change: (item: FormulaItem) => FormulaItem): Expression {
  const found = findItem(root, id);
  if (!found) {
    return root;
  }

  return changeExpression(root, found.address, (expression) => expression.map((item) => (item.id === id ? change(item) : item)));
}

/** Adds an empty argument to a function (a repeating parameter's "add" button). */
export function addArgument(root: Expression, functionId: number): Expression {
  return updateItem(root, functionId, (item) => (item.kind === 'function' ? { ...item, args: [...item.args, []] } : item));
}

/** Drops one argument (and whatever is in it) from a function. */
export function removeArgument(root: Expression, functionId: number, index: number): Expression {
  return updateItem(root, functionId, (item) => {
    return item.kind === 'function' ? { ...item, args: item.args.filter((_, position) => position !== index) } : item;
  });
}

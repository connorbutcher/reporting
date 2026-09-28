import { Expression } from '../items/expression';
import { ExpressionAddress } from '../items/expression-address';
import { FormulaItem } from '../items/formula-item';
import { childExpressions, withChild } from './child-expressions';

/**
 * Rebuilds `root` with the expression at `address` replaced by `change(expression)`. Every change returns
 * a new root that shares whatever it didn't touch, so the root can be held in a signal and every earlier
 * state kept for undo.
 */
export function changeExpression(root: Expression, address: ExpressionAddress, change: (expression: Expression) => Expression): Expression {
  if (address.ownerId === null) {
    return change(root);
  }

  return rewrite(root, address, change);
}

function rewrite(expression: Expression, address: ExpressionAddress, change: (expression: Expression) => Expression): Expression {
  let next: FormulaItem[] | null = null;

  for (let index = 0; index < expression.length; index++) {
    const item = expression[index];
    const rewritten = rewriteItem(item, address, change);
    if (rewritten === item) {
      continue;
    }

    next ??= [...expression];
    next[index] = rewritten;
  }

  return next ?? expression;
}

function rewriteItem(item: FormulaItem, address: ExpressionAddress, change: (expression: Expression) => Expression): FormulaItem {
  const children = childExpressions(item);

  if (item.id === address.ownerId) {
    const child = children[address.arg];
    return child === undefined ? item : withChild(item, address.arg, change(child));
  }

  let result = item;
  for (let arg = 0; arg < children.length; arg++) {
    const child = children[arg];
    const rewritten = rewrite(child, address, change);
    if (rewritten !== child) {
      result = withChild(result, arg, rewritten);
    }
  }

  return result;
}

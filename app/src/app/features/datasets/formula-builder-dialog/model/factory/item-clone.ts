import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { newItemId } from './item-id';

/** A deep copy with fresh ids, so a copy can sit beside its original without the two sharing an identity. */
export function cloneItem(item: FormulaItem): FormulaItem {
  switch (item.kind) {
    case 'function':
      return { ...item, id: newItemId(), args: item.args.map(cloneExpression) };
    case 'group':
      return { ...item, id: newItemId(), body: cloneExpression(item.body) };
    default:
      return { ...item, id: newItemId() };
  }
}

export function cloneExpression(expression: Expression): Expression {
  return expression.map(cloneItem);
}

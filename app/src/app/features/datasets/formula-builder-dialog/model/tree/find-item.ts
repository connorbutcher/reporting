import { Expression } from '../items/expression';
import { ExpressionAddress } from '../items/expression-address';
import { FormulaItem } from '../items/formula-item';
import { ROOT } from '../items/root-address';
import { childExpressions } from './child-expressions';
import { ItemLocation } from './item-location';

export function findItem(root: Expression, id: number, address: ExpressionAddress = ROOT): ItemLocation | null {
  for (let index = 0; index < root.length; index++) {
    const item = root[index];
    if (item.id === id) {
      return { item, address, index };
    }

    const children = childExpressions(item);
    for (let arg = 0; arg < children.length; arg++) {
      const found = findItem(children[arg], id, { ownerId: item.id, arg });
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/** Whether `id` is `item` itself or lies inside it. */
export function containsItem(item: FormulaItem, id: number): boolean {
  return findItem([item], id) !== null;
}

/** Every item, depth first, in reading order. */
export function* walk(root: Expression): Generator<FormulaItem> {
  for (const item of root) {
    yield item;
    for (const child of childExpressions(item)) {
      yield* walk(child);
    }
  }
}

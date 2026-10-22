import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { ExpressionAddress } from '../items/expression-address';
import { FormulaItems } from '../items/formula-items';
import { ItemLocation } from './item-location';
import { SelectionRange } from './selection-range';

/** Reads and rebuilds the expression tree. Every change returns a new root that shares whatever it didn't touch, so earlier states can be kept for undo. */
export class ExpressionTree {
  private static readonly NO_CHILDREN: readonly Expression[] = [];

  /**
   * Rebuilds `root` with the expression at `address` replaced by `change(expression)`. Every change returns
   * a new root that shares whatever it didn't touch, so the root can be held in a signal and every earlier
   * state kept for undo.
   */
  public static change(
    root: Expression,
    address: ExpressionAddress,
    change: (expression: Expression) => Expression,
  ): Expression {
    if (address.ownerId === null) {
      return change(root);
    }

    return ExpressionTree.rewrite(root, address, change);
  }

  public static find(
    root: Expression,
    id: number,
    address: ExpressionAddress = FormulaItems.ROOT,
  ): ItemLocation | null {
    for (let index = 0; index < root.length; index++) {
      const item = root[index];
      if (item.id === id) {
        return { item, address, index };
      }

      const children = ExpressionTree.children(item);
      for (let arg = 0; arg < children.length; arg++) {
        const found = ExpressionTree.find(children[arg], id, { ownerId: item.id, arg });
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /** Whether `id` is `item` itself or lies inside it. */
  public static contains(item: FormulaItem, id: number): boolean {
    return ExpressionTree.find([item], id) !== null;
  }

  /** The expression at `address`, or null when the item that owned it is gone. */
  public static expressionAt(root: Expression, address: ExpressionAddress): Expression | null {
    if (address.ownerId === null) {
      return root;
    }

    const owner = ExpressionTree.find(root, address.ownerId)?.item;
    return owner ? (ExpressionTree.children(owner)[address.arg] ?? null) : null;
  }

  public static isSameAddress(a: ExpressionAddress, b: ExpressionAddress): boolean {
    return a.ownerId === b.ownerId && a.arg === b.arg;
  }

  /**
   * Finds a selection in the formula. Ids that no longer exist are ignored, and a selection that has spread
   * across more than one expression is no selection at all (null).
   */
  public static locateSelection(root: Expression, ids: readonly number[]): SelectionRange | null {
    const found: ItemLocation[] = [];
    for (const id of ids) {
      const location = ExpressionTree.find(root, id);
      if (location) {
        found.push(location);
      }
    }

    if (found.length === 0) {
      return null;
    }

    const { address } = found[0];
    if (found.some((location) => !ExpressionTree.isSameAddress(location.address, address))) {
      return null;
    }

    const ordered = [...found].sort((a, b) => a.index - b.index);
    const start = ordered[0].index;
    return {
      address,
      items: ordered.map((location) => location.item),
      start,
      contiguous: ordered[ordered.length - 1].index - start + 1 === ordered.length,
    };
  }

  /** The expressions directly inside an item: a function's arguments, a group's body. */
  private static children(item: FormulaItem): readonly Expression[] {
    if (item.kind === 'function') {
      return item.args;
    }

    if (item.kind === 'group') {
      return [item.body];
    }

    return ExpressionTree.NO_CHILDREN;
  }

  /** The item with the expression at `arg` swapped for `expression`. */
  private static withChild(item: FormulaItem, arg: number, expression: Expression): FormulaItem {
    if (item.kind === 'function') {
      return {
        ...item,
        args: item.args.map((existing, index) => (index === arg ? expression : existing)),
      };
    }

    if (item.kind === 'group') {
      return { ...item, body: expression };
    }

    return item;
  }

  private static rewrite(
    expression: Expression,
    address: ExpressionAddress,
    change: (expression: Expression) => Expression,
  ): Expression {
    let next: FormulaItem[] | null = null;

    for (let index = 0; index < expression.length; index++) {
      const item = expression[index];
      const rewritten = ExpressionTree.rewriteItem(item, address, change);
      if (rewritten === item) {
        continue;
      }

      next ??= [...expression];
      next[index] = rewritten;
    }

    return next ?? expression;
  }

  private static rewriteItem(
    item: FormulaItem,
    address: ExpressionAddress,
    change: (expression: Expression) => Expression,
  ): FormulaItem {
    const children = ExpressionTree.children(item);

    if (item.id === address.ownerId) {
      const child = children[address.arg];
      return child === undefined
        ? item
        : ExpressionTree.withChild(item, address.arg, change(child));
    }

    let result = item;
    for (let arg = 0; arg < children.length; arg++) {
      const child = children[arg];
      const rewritten = ExpressionTree.rewrite(child, address, change);
      if (rewritten !== child) {
        result = ExpressionTree.withChild(result, arg, rewritten);
      }
    }

    return result;
  }
}

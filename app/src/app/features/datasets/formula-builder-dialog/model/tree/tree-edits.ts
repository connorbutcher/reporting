import { Expression } from '../items/expression';
import { ExpressionTree } from './expression-tree';
import { ExpressionAddress } from '../items/expression-address';
import { FormulaItem } from '../items/formula-item';

/** Edits that return a new formula root. */
export class TreeEdits {
  /** Takes an item out of wherever it is. */
  public static removeItem(root: Expression, id: number): Expression {
    const found = ExpressionTree.find(root, id);
    if (!found) {
      return root;
    }

    return ExpressionTree.change(root, found.address, (expression) =>
      expression.filter((item) => item.id !== id),
    );
  }

  /** Takes several items out, wherever they are. */
  public static removeItems(root: Expression, ids: readonly number[]): Expression {
    let next = root;
    for (const id of ids) {
      next = TreeEdits.removeItem(next, id);
    }

    return next;
  }

  /** Replaces `count` items from `start` in the expression at `address` with `replacement`. */
  public static replaceItems(
    root: Expression,
    address: ExpressionAddress,
    start: number,
    count: number,
    replacement: readonly FormulaItem[],
  ): Expression {
    return ExpressionTree.change(root, address, (expression) => {
      return [...expression.slice(0, start), ...replacement, ...expression.slice(start + count)];
    });
  }

  /** Puts `items` into the expression at `address`, before the item at `index` (or at the end). */
  public static insertItems(
    root: Expression,
    address: ExpressionAddress,
    index: number,
    items: readonly FormulaItem[],
  ): Expression {
    return TreeEdits.replaceItems(root, address, Math.max(0, index), 0, items);
  }

  /** Puts `item` into the expression at `address`, before the item currently at `index` (or at the end). */
  public static insertItem(
    root: Expression,
    address: ExpressionAddress,
    index: number,
    item: FormulaItem,
  ): Expression {
    return ExpressionTree.change(root, address, (expression) => {
      const at = Math.min(Math.max(index, 0), expression.length);
      return [...expression.slice(0, at), item, ...expression.slice(at)];
    });
  }

  /** Dissolves a group, leaving what was inside it in its place. */
  public static unwrapGroup(root: Expression, groupId: number): Expression {
    const found = ExpressionTree.find(root, groupId);
    if (found?.item.kind !== 'group') {
      return root;
    }

    return TreeEdits.replaceItems(root, found.address, found.index, 1, found.item.body);
  }

  /** Replaces the item with `id` by the result of `change`. */
  public static updateItem(
    root: Expression,
    id: number,
    change: (item: FormulaItem) => FormulaItem,
  ): Expression {
    const found = ExpressionTree.find(root, id);
    if (!found) {
      return root;
    }

    return ExpressionTree.change(root, found.address, (expression) =>
      expression.map((item) => (item.id === id ? change(item) : item)),
    );
  }

  /** Adds an empty argument to a function (a repeating parameter's "add" button). */
  public static addArgument(root: Expression, functionId: number): Expression {
    return TreeEdits.updateItem(root, functionId, (item) =>
      item.kind === 'function' ? { ...item, args: [...item.args, []] } : item,
    );
  }

  /** Drops one argument (and whatever is in it) from a function. */
  public static removeArgument(root: Expression, functionId: number, index: number): Expression {
    return TreeEdits.updateItem(root, functionId, (item) => {
      return item.kind === 'function'
        ? { ...item, args: item.args.filter((_, position) => position !== index) }
        : item;
    });
  }
}

import { Expression, ExpressionAddress, FormulaItem, ROOT } from './formula-block';

/** Where an item sits: the expression it is in, and its place in it. */
export interface ItemLocation {
  item: FormulaItem;
  address: ExpressionAddress;
  index: number;
}

/**
 * Pure operations on the formula. Every change returns a new root that shares whatever it didn't touch,
 * so the root can be held in a signal and every earlier state kept for undo.
 */

/** The expressions directly inside an item: a function's arguments, a group's body. */
function childExpressions(item: FormulaItem): readonly Expression[] {
  if (item.kind === 'function') return item.args;
  if (item.kind === 'group') return [item.body];
  return [];
}

export function findItem(root: Expression, id: number, address: ExpressionAddress = ROOT): ItemLocation | null {
  for (let index = 0; index < root.length; index++) {
    const item = root[index];
    if (item.id === id) return { item, address, index };

    const children = childExpressions(item);
    for (let arg = 0; arg < children.length; arg++) {
      const found = findItem(children[arg], id, { ownerId: item.id, arg });
      if (found) return found;
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
    for (const child of childExpressions(item)) yield* walk(child);
  }
}

/** The expression at `address`, or null when the item that owned it is gone. */
export function expressionAt(root: Expression, address: ExpressionAddress): Expression | null {
  if (address.ownerId === null) return root;
  const owner = findItem(root, address.ownerId)?.item;
  return owner ? (childExpressions(owner)[address.arg] ?? null) : null;
}

function withChild(item: FormulaItem, arg: number, expression: Expression): FormulaItem {
  if (item.kind === 'function') return { ...item, args: item.args.map((a, i) => (i === arg ? expression : a)) };
  if (item.kind === 'group') return { ...item, body: expression };
  return item;
}

/** Rebuilds `root` with the expression at `address` replaced by `change(expression)`. */
export function changeExpression(root: Expression, address: ExpressionAddress, change: (expression: Expression) => Expression): Expression {
  if (address.ownerId === null) return change(root);

  const rewrite = (expression: Expression): Expression => {
    let changed = false;
    const next = expression.map((item) => {
      if (item.id === address.ownerId) {
        const child = childExpressions(item)[address.arg];
        if (child === undefined) return item;
        changed = true;
        return withChild(item, address.arg, change(child));
      }
      const children = childExpressions(item);
      let inner: FormulaItem = item;
      children.forEach((child, arg) => {
        const rewritten = rewrite(child);
        if (rewritten !== child) inner = withChild(inner, arg, rewritten);
      });
      if (inner !== item) changed = true;
      return inner;
    });
    return changed ? next : expression;
  };
  return rewrite(root);
}

/** Puts `item` into the expression at `address`, before the item currently at `index` (or at the end). */
export function insertItem(root: Expression, address: ExpressionAddress, index: number, item: FormulaItem): Expression {
  return changeExpression(root, address, (expression) => {
    const at = Math.min(Math.max(index, 0), expression.length);
    return [...expression.slice(0, at), item, ...expression.slice(at)];
  });
}

/** Takes an item out of wherever it is. */
export function removeItem(root: Expression, id: number): Expression {
  const found = findItem(root, id);
  if (!found) return root;
  return changeExpression(root, found.address, (expression) => expression.filter((item) => item.id !== id));
}

/** Replaces the item with `id` by the result of `change`. */
export function updateItem(root: Expression, id: number, change: (item: FormulaItem) => FormulaItem): Expression {
  const found = findItem(root, id);
  if (!found) return root;
  return changeExpression(root, found.address, (expression) => expression.map((item) => (item.id === id ? change(item) : item)));
}

/** Adds an empty argument to a function (a repeating parameter's "add" button). */
export function addArgument(root: Expression, functionId: number): Expression {
  return updateItem(root, functionId, (item) => (item.kind === 'function' ? { ...item, args: [...item.args, []] } : item));
}

/** Drops one argument (and whatever is in it) from a function. */
export function removeArgument(root: Expression, functionId: number, index: number): Expression {
  return updateItem(root, functionId, (item) =>
    item.kind === 'function' ? { ...item, args: item.args.filter((_, i) => i !== index) } : item,
  );
}

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

/**
 * Finds a selection in the formula. Ids that no longer exist are ignored, and a selection that has spread
 * across more than one expression is no selection at all (null).
 */
export function locateSelection(root: Expression, ids: readonly number[]): SelectionRange | null {
  const found = ids.map((id) => findItem(root, id)).filter((location): location is ItemLocation => location !== null);
  if (found.length === 0) return null;

  const { address } = found[0];
  if (found.some((location) => location.address.ownerId !== address.ownerId || location.address.arg !== address.arg)) return null;

  const ordered = [...found].sort((a, b) => a.index - b.index);
  const start = ordered[0].index;
  return {
    address,
    items: ordered.map((location) => location.item),
    start,
    contiguous: ordered[ordered.length - 1].index - start + 1 === ordered.length,
  };
}

/** Replaces `count` items from `start` in the expression at `address` with `replacement`. */
export function replaceItems(root: Expression, address: ExpressionAddress, start: number, count: number, replacement: readonly FormulaItem[]): Expression {
  return changeExpression(root, address, (expression) => [...expression.slice(0, start), ...replacement, ...expression.slice(start + count)]);
}

/** Puts `items` into the expression at `address`, before the item at `index` (or at the end). */
export function insertItems(root: Expression, address: ExpressionAddress, index: number, items: readonly FormulaItem[]): Expression {
  return replaceItems(root, address, Math.max(0, index), 0, items);
}

/** Takes several items out, wherever they are. */
export function removeItems(root: Expression, ids: readonly number[]): Expression {
  return ids.reduce((next, id) => removeItem(next, id), root);
}

/** Dissolves a group, leaving what was inside it in its place. */
export function unwrapGroup(root: Expression, groupId: number): Expression {
  const found = findItem(root, groupId);
  if (found?.item.kind !== 'group') return root;
  return replaceItems(root, found.address, found.index, 1, found.item.body);
}

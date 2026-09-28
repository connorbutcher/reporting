import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';

const NO_CHILDREN: readonly Expression[] = [];

/** The expressions directly inside an item: a function's arguments, a group's body. */
export function childExpressions(item: FormulaItem): readonly Expression[] {
  if (item.kind === 'function') {
    return item.args;
  }

  if (item.kind === 'group') {
    return [item.body];
  }

  return NO_CHILDREN;
}

/** The item with the expression at `arg` swapped for `expression`. */
export function withChild(item: FormulaItem, arg: number, expression: Expression): FormulaItem {
  if (item.kind === 'function') {
    return { ...item, args: item.args.map((existing, index) => (index === arg ? expression : existing)) };
  }

  if (item.kind === 'group') {
    return { ...item, body: expression };
  }

  return item;
}

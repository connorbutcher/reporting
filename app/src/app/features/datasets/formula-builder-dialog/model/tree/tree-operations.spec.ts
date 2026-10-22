import { describe, expect, it } from 'vitest';
import { ItemFactory } from '../factory/item-factory';
import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { TestItems } from '../testing/test-items';
import { ExpressionTree } from './expression-tree';
import { TreeEdits } from './tree-edits';
describe('formula tree operations', () => {
  it('inserts an item at a place in the root, without touching the original', () => {
    const root: Expression = [TestItems.col('Qty'), TestItems.col('Price')];
    const plus = TestItems.op('+');

    const next = TreeEdits.insertItem(root, { ownerId: null, arg: 0 }, 1, plus);

    expect(root).toHaveLength(2);
    expect(next.map((i) => i.id)).toEqual([root[0].id, plus.id, root[1].id]);
  });

  it('inserts into a function argument or a group, and shares what it did not change', () => {
    const round = TestItems.call('ROUND', [], []);
    const other = TestItems.col('Price');
    const root: Expression = [round, TestItems.op('+'), other];
    const qty = TestItems.col('Qty');

    const next = TreeEdits.insertItem(root, { ownerId: round.id, arg: 0 }, 0, qty);

    expect(next[2]).toBe(other);
    expect(ExpressionTree.expressionAt(next, { ownerId: round.id, arg: 0 })).toEqual([qty]);

    const group = ItemFactory.group([]);
    const grouped = TreeEdits.insertItem(
      [group],
      { ownerId: group.id, arg: 0 },
      0,
      TestItems.lit(1),
    );
    expect(ExpressionTree.expressionAt(grouped, { ownerId: group.id, arg: 0 })).toHaveLength(1);
  });

  it('finds an item anywhere and says which expression it is in', () => {
    const qty = TestItems.col('Qty');
    const round = TestItems.call('ROUND', [qty], []);
    const found = ExpressionTree.find([round], qty.id);

    expect(found?.address).toEqual({ ownerId: round.id, arg: 0 });
    expect(found?.index).toBe(0);
    expect(ExpressionTree.find([round], 9999)).toBeNull();
  });

  it('removes an item from wherever it is', () => {
    const qty = TestItems.col('Qty');
    const round = TestItems.call('ROUND', [qty], []);

    const next = TreeEdits.removeItem([round], qty.id);

    expect(ExpressionTree.expressionAt(next, { ownerId: round.id, arg: 0 })).toEqual([]);
    expect(TreeEdits.removeItem([round], round.id)).toEqual([]);
  });

  it('knows an item contains itself and what is inside it, but not a sibling', () => {
    const qty = TestItems.col('Qty');
    const round = TestItems.call('ROUND', [qty], []);
    const price = TestItems.col('Price');

    expect(ExpressionTree.contains(round, qty.id)).toBe(true);
    expect(ExpressionTree.contains(round, round.id)).toBe(true);
    expect(ExpressionTree.contains(round, price.id)).toBe(false);
  });

  it('updates an item in place', () => {
    const value = TestItems.lit(1);
    const next = TreeEdits.updateItem(
      [TestItems.col('Qty'), value],
      value.id,
      (item) => ({ ...item, value: 5 }) as FormulaItem,
    );
    expect(next[1]).toMatchObject({ kind: 'literal', value: 5 });
  });

  it('adds an argument to a function', () => {
    const sum = TestItems.call('SUM', [], []);
    const next = TreeEdits.addArgument([sum], sum.id);
    expect(next[0].kind === 'function' && next[0].args).toHaveLength(3);
  });
});

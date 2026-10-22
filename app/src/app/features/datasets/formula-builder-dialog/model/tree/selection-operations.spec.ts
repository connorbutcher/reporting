import { describe, expect, it } from 'vitest';
import { ItemFactory } from '../factory/item-factory';
import { Expression } from '../items/expression';
import { FormulaSerializer } from '../serializer/formula-serializer';
import { TestCatalogue } from '../testing/test-catalogue';
import { TestItems } from '../testing/test-items';
import { TestText } from '../testing/test-text';
import { ExpressionTree } from './expression-tree';
import { TreeEdits } from './tree-edits';
describe('working with several items', () => {
  const ROOT = { ownerId: null, arg: 0 };

  it('finds a selection, in reading order, and says whether its items are neighbours', () => {
    const [a, plus, b, times, c] = [
      TestItems.col('Qty'),
      TestItems.op('+'),
      TestItems.col('Price'),
      TestItems.op('*'),
      TestItems.lit(2),
    ];
    const root: Expression = [a, plus, b, times, c];

    const together = ExpressionTree.locateSelection(root, [b.id, plus.id]);
    expect(together?.items.map((i) => i.id)).toEqual([plus.id, b.id]);
    expect(together).toMatchObject({ start: 1, contiguous: true, address: ROOT });

    expect(ExpressionTree.locateSelection(root, [a.id, b.id])?.contiguous).toBe(false);
  });

  it('ignores selected items that have gone, and refuses a selection that spans expressions', () => {
    const qty = TestItems.col('Qty');
    const inner = TestItems.col('Price');
    const round = ItemFactory.function(TestCatalogue.SCOPE.functions.get('ROUND'), 'ROUND', [
      [inner],
      [],
    ]);
    const root: Expression = [qty, round];

    expect(ExpressionTree.locateSelection(root, [qty.id, 9999])?.items).toEqual([qty]);
    expect(ExpressionTree.locateSelection(root, [])).toBeNull();
    expect(ExpressionTree.locateSelection(root, [qty.id, inner.id])).toBeNull();
  });

  it('wraps neighbouring items in brackets, keeping their order and the rest of the row', () => {
    const [a, plus, b, times, c] = [
      TestItems.col('Qty'),
      TestItems.op('+'),
      TestItems.col('Price'),
      TestItems.op('*'),
      TestItems.lit(2),
    ];
    const root: Expression = [a, plus, b, times, c];
    const range = ExpressionTree.locateSelection(root, [a.id, plus.id, b.id])!;
    const group = ItemFactory.group(range.items);

    const next = TreeEdits.replaceItems(root, range.address, range.start, range.items.length, [
      group,
    ]);

    expect(next.map((i) => i.kind)).toEqual(['group', 'operator', 'literal']);
    expect(TestText.write(next)).toBe('([Qty] + [Price]) * 2');
    expect(root).toHaveLength(5); // the original is untouched, so undo has it
  });

  it('wraps a selection as an argument of a function, in a nested expression', () => {
    const [qty, times, price, plus, one] = [
      TestItems.col('Qty'),
      TestItems.op('*'),
      TestItems.col('Price'),
      TestItems.op('+'),
      TestItems.lit(1),
    ];
    const root: Expression = [qty, times, price, plus, one];
    const range = ExpressionTree.locateSelection(root, [qty.id, times.id, price.id])!;
    const round = ItemFactory.function(TestCatalogue.SCOPE.functions.get('ROUND'), 'ROUND', [
      range.items,
      [],
    ]);

    const next = TreeEdits.replaceItems(root, range.address, range.start, 3, [round]);

    const written = FormulaSerializer.serialize(next, (_, i) => ({
      name: 'n',
      optional: i === 1,
    })).text;
    expect(written).toBe(['ROUND(', '  [Qty] * [Price]', ') + 1'].join('\n'));
    expect(ExpressionTree.expressionAt(next, { ownerId: round.id, arg: 0 })).toHaveLength(3);
  });

  it('dissolves a group, leaving what was inside it where it stood', () => {
    const [qty, plus, one] = [TestItems.col('Qty'), TestItems.op('+'), TestItems.lit(1)];
    const group = ItemFactory.group([qty, plus, one]);
    const root: Expression = [TestItems.op('-'), group, TestItems.op('*'), TestItems.col('Price')];

    const next = TreeEdits.unwrapGroup(root, group.id);

    expect(next.map((i) => i.kind)).toEqual([
      'operator',
      'column',
      'operator',
      'literal',
      'operator',
      'column',
    ]);
    expect(TreeEdits.unwrapGroup(root, root[0].id)).toBe(root); // not a group: nothing changes
  });

  it('removes several items at once, from anywhere', () => {
    const [a, b] = [TestItems.col('Qty'), TestItems.col('Price')];
    const round = ItemFactory.function(TestCatalogue.SCOPE.functions.get('ROUND'), 'ROUND', [
      [a],
      [],
    ]);
    const root: Expression = [round, TestItems.op('+'), b];

    const next = TreeEdits.removeItems(root, [a.id, b.id]);

    expect(ExpressionTree.expressionAt(next, { ownerId: round.id, arg: 0 })).toEqual([]);
    expect(next.map((i) => i.kind)).toEqual(['function', 'operator']);
  });

  it('inserts several items at a place', () => {
    const [a, b] = [TestItems.col('Qty'), TestItems.col('Price')];
    const next = TreeEdits.insertItems([a], ROOT, 1, [TestItems.op('+'), b]);
    expect(next.map((i) => i.kind)).toEqual(['column', 'operator', 'column']);
  });
});

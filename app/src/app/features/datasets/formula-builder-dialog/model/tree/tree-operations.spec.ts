import { describe, expect, it } from 'vitest';
import { groupBlock } from '../factory/item-factory';
import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { call, col, lit, op } from '../testing/test-items';
import { expressionAt } from './expression-at';
import { findItem, containsItem } from './find-item';
import { insertItem } from './replace-items';
import { removeItem } from './remove-items';
import { addArgument, updateItem } from './update-item';

describe('formula tree operations', () => {
  it('inserts an item at a place in the root, without touching the original', () => {
    const root: Expression = [col('Qty'), col('Price')];
    const plus = op('+');

    const next = insertItem(root, { ownerId: null, arg: 0 }, 1, plus);

    expect(root).toHaveLength(2);
    expect(next.map((i) => i.id)).toEqual([root[0].id, plus.id, root[1].id]);
  });

  it('inserts into a function argument or a group, and shares what it did not change', () => {
    const round = call('ROUND', [], []);
    const other = col('Price');
    const root: Expression = [round, op('+'), other];
    const qty = col('Qty');

    const next = insertItem(root, { ownerId: round.id, arg: 0 }, 0, qty);

    expect(next[2]).toBe(other);
    expect(expressionAt(next, { ownerId: round.id, arg: 0 })).toEqual([qty]);

    const group = groupBlock([]);
    const grouped = insertItem([group], { ownerId: group.id, arg: 0 }, 0, lit(1));
    expect(expressionAt(grouped, { ownerId: group.id, arg: 0 })).toHaveLength(1);
  });

  it('finds an item anywhere and says which expression it is in', () => {
    const qty = col('Qty');
    const round = call('ROUND', [qty], []);
    const found = findItem([round], qty.id);

    expect(found?.address).toEqual({ ownerId: round.id, arg: 0 });
    expect(found?.index).toBe(0);
    expect(findItem([round], 9999)).toBeNull();
  });

  it('removes an item from wherever it is', () => {
    const qty = col('Qty');
    const round = call('ROUND', [qty], []);

    const next = removeItem([round], qty.id);

    expect(expressionAt(next, { ownerId: round.id, arg: 0 })).toEqual([]);
    expect(removeItem([round], round.id)).toEqual([]);
  });

  it('knows an item contains itself and what is inside it, but not a sibling', () => {
    const qty = col('Qty');
    const round = call('ROUND', [qty], []);
    const price = col('Price');

    expect(containsItem(round, qty.id)).toBe(true);
    expect(containsItem(round, round.id)).toBe(true);
    expect(containsItem(round, price.id)).toBe(false);
  });

  it('updates an item in place', () => {
    const value = lit(1);
    const next = updateItem([col('Qty'), value], value.id, (item) => ({ ...item, value: 5 }) as FormulaItem);
    expect(next[1]).toMatchObject({ kind: 'literal', value: 5 });
  });

  it('adds an argument to a function', () => {
    const sum = call('SUM', [], []);
    const next = addArgument([sum], sum.id);
    expect(next[0].kind === 'function' && next[0].args).toHaveLength(3);
  });
});

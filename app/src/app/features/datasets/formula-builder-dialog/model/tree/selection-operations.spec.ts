import { describe, expect, it } from 'vitest';
import { functionBlock, groupBlock } from '../factory/item-factory';
import { Expression } from '../items/expression';
import { serializeFormula } from '../serializer/serialize-formula';
import { SCOPE } from '../testing/test-catalogue';
import { col, lit, op } from '../testing/test-items';
import { write } from '../testing/test-text';
import { expressionAt } from './expression-at';
import { locateSelection } from './locate-selection';
import { removeItems } from './remove-items';
import { insertItems, replaceItems, unwrapGroup } from './replace-items';

describe('working with several items', () => {
  const ROOT = { ownerId: null, arg: 0 };

  it('finds a selection, in reading order, and says whether its items are neighbours', () => {
    const [a, plus, b, times, c] = [col('Qty'), op('+'), col('Price'), op('*'), lit(2)];
    const root: Expression = [a, plus, b, times, c];

    const together = locateSelection(root, [b.id, plus.id]);
    expect(together?.items.map((i) => i.id)).toEqual([plus.id, b.id]);
    expect(together).toMatchObject({ start: 1, contiguous: true, address: ROOT });

    expect(locateSelection(root, [a.id, b.id])?.contiguous).toBe(false);
  });

  it('ignores selected items that have gone, and refuses a selection that spans expressions', () => {
    const qty = col('Qty');
    const inner = col('Price');
    const round = functionBlock(SCOPE.functions.get('ROUND'), 'ROUND', [[inner], []]);
    const root: Expression = [qty, round];

    expect(locateSelection(root, [qty.id, 9999])?.items).toEqual([qty]);
    expect(locateSelection(root, [])).toBeNull();
    expect(locateSelection(root, [qty.id, inner.id])).toBeNull();
  });

  it('wraps neighbouring items in brackets, keeping their order and the rest of the row', () => {
    const [a, plus, b, times, c] = [col('Qty'), op('+'), col('Price'), op('*'), lit(2)];
    const root: Expression = [a, plus, b, times, c];
    const range = locateSelection(root, [a.id, plus.id, b.id])!;
    const group = groupBlock(range.items);

    const next = replaceItems(root, range.address, range.start, range.items.length, [group]);

    expect(next.map((i) => i.kind)).toEqual(['group', 'operator', 'literal']);
    expect(write(next)).toBe('([Qty] + [Price]) * 2');
    expect(root).toHaveLength(5); // the original is untouched, so undo has it
  });

  it('wraps a selection as an argument of a function, in a nested expression', () => {
    const [qty, times, price, plus, one] = [col('Qty'), op('*'), col('Price'), op('+'), lit(1)];
    const root: Expression = [qty, times, price, plus, one];
    const range = locateSelection(root, [qty.id, times.id, price.id])!;
    const round = functionBlock(SCOPE.functions.get('ROUND'), 'ROUND', [range.items, []]);

    const next = replaceItems(root, range.address, range.start, 3, [round]);

    const written = serializeFormula(next, (_, i) => ({ name: 'n', optional: i === 1 })).text;
    expect(written).toBe(['ROUND(', '  [Qty] * [Price]', ') + 1'].join('\n'));
    expect(expressionAt(next, { ownerId: round.id, arg: 0 })).toHaveLength(3);
  });

  it('dissolves a group, leaving what was inside it where it stood', () => {
    const [qty, plus, one] = [col('Qty'), op('+'), lit(1)];
    const group = groupBlock([qty, plus, one]);
    const root: Expression = [op('-'), group, op('*'), col('Price')];

    const next = unwrapGroup(root, group.id);

    expect(next.map((i) => i.kind)).toEqual(['operator', 'column', 'operator', 'literal', 'operator', 'column']);
    expect(unwrapGroup(root, root[0].id)).toBe(root); // not a group: nothing changes
  });

  it('removes several items at once, from anywhere', () => {
    const [a, b] = [col('Qty'), col('Price')];
    const round = functionBlock(SCOPE.functions.get('ROUND'), 'ROUND', [[a], []]);
    const root: Expression = [round, op('+'), b];

    const next = removeItems(root, [a.id, b.id]);

    expect(expressionAt(next, { ownerId: round.id, arg: 0 })).toEqual([]);
    expect(next.map((i) => i.kind)).toEqual(['function', 'operator']);
  });

  it('inserts several items at a place', () => {
    const [a, b] = [col('Qty'), col('Price')];
    const next = insertItems([a], ROOT, 1, [op('+'), b]);
    expect(next.map((i) => i.kind)).toEqual(['column', 'operator', 'column']);
  });
});

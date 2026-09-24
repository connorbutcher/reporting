import { describe, expect, it } from 'vitest';
import { FormulaItem } from '../items/formula-item';
import { SCOPE } from '../testing/test-catalogue';
import { col, lit, op } from '../testing/test-items';
import { write } from '../testing/test-text';
import { functionBlock, groupBlock } from './item-factory';
import { cloneItem } from './item-clone';

function idsOf(item: FormulaItem): number[] {
  const found: number[] = [item.id];

  if (item.kind === 'group') {
    for (const child of item.body) {
      found.push(...idsOf(child));
    }
  } else if (item.kind === 'function') {
    for (const arg of item.args) {
      for (const child of arg) {
        found.push(...idsOf(child));
      }
    }
  }

  return found;
}

describe('cloneItem', () => {
  it('copies deeply with fresh ids, so a paste is independent of what it was copied from', () => {
    const qty = col('Qty');
    const round = functionBlock(SCOPE.functions.get('ROUND'), 'ROUND', [[qty, op('*'), lit(2)], []]);
    const group = groupBlock([round]);

    const copy = cloneItem(group);

    expect(copy.id).not.toBe(group.id);
    expect(write([copy])).toBe(write([group]));

    const original = new Set(idsOf(group));
    expect(idsOf(copy).some((id) => original.has(id))).toBe(false);
    expect(idsOf(copy)).toHaveLength(idsOf(group).length);
  });
});

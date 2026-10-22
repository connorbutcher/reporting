import { describe, expect, it } from 'vitest';
import { FormulaItem } from '../items/formula-item';
import { TestCatalogue } from '../testing/test-catalogue';
import { TestItems } from '../testing/test-items';
import { TestText } from '../testing/test-text';
import { ItemFactory } from './item-factory';

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
    const qty = TestItems.col('Qty');
    const round = ItemFactory.function(TestCatalogue.SCOPE.functions.get('ROUND'), 'ROUND', [
      [qty, TestItems.op('*'), TestItems.lit(2)],
      [],
    ]);
    const group = ItemFactory.group([round]);

    const copy = ItemFactory.clone(group);

    expect(copy.id).not.toBe(group.id);
    expect(TestText.write([copy])).toBe(TestText.write([group]));

    const original = new Set(idsOf(group));
    expect(idsOf(copy).some((id) => original.has(id))).toBe(false);
    expect(idsOf(copy)).toHaveLength(idsOf(group).length);
  });
});

import { Expression } from '../items/expression';
import { findItem } from './find-item';
import { ItemLocation } from './item-location';
import { SelectionRange } from './selection-range';

/**
 * Finds a selection in the formula. Ids that no longer exist are ignored, and a selection that has spread
 * across more than one expression is no selection at all (null).
 */
export function locateSelection(root: Expression, ids: readonly number[]): SelectionRange | null {
  const found: ItemLocation[] = [];
  for (const id of ids) {
    const location = findItem(root, id);
    if (location) {
      found.push(location);
    }
  }

  if (found.length === 0) {
    return null;
  }

  const { address } = found[0];
  if (found.some((location) => location.address.ownerId !== address.ownerId || location.address.arg !== address.arg)) {
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

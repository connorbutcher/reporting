/**
 * Groups a flat list into a lookup by parent id, so a recursive tree builder can pull a level's
 * direct children in O(1) instead of re-filtering the whole flat list at every level — which is
 * what the move and create dialogs' tree builders used to do (an O(depth × n) walk over the same
 * array). Shared here since both dialogs build a folder hierarchy from the same flat shape.
 */
export function groupByParent<T>(
  items: readonly T[],
  parentIdOf: (item: T) => number | null,
): Map<number | null, T[]> {
  const byParent = new Map<number | null, T[]>();
  for (const item of items) {
    const key = parentIdOf(item);
    const siblings = byParent.get(key);
    if (siblings) siblings.push(item);
    else byParent.set(key, [item]);
  }
  return byParent;
}

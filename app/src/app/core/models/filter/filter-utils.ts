import { FilterGroup, FilterNode } from './filter.model';

/** Drops empty groups so a half-built filter never narrows anything. */
export function pruneFilter(node: FilterNode | null): FilterNode | null {
  if (!node) return null;
  if (node.kind === 'condition') return node;

  const children = node.children.map(pruneFilter).filter((c): c is FilterNode => c !== null);
  return children.length === 0 ? null : { kind: 'group', join: node.join, children };
}

/** Combines a report-level and a widget-level filter into the one tree sent to the API. */
export function combineFilters(...filters: (FilterNode | null)[]): FilterGroup | null {
  const parts = filters.map(pruneFilter).filter((f): f is FilterNode => f !== null);
  if (parts.length === 0) return null;
  return { kind: 'group', join: 'and', children: parts };
}

/**
 * A canonical string for comparing two filters by meaning.
 *
 * Not `JSON.stringify`: the server omits the `kind` discriminator on a root
 * group (its DTO property is the concrete group type) and writes keys in a
 * different order, so structural equality on the raw JSON gives false
 * positives. Empty groups collapse to nothing, so "no filter" and "an empty
 * group" compare equal.
 */
export function filterKey(node: FilterNode | null): string {
  const pruned = pruneFilter(node);
  if (!pruned) return '';

  if (pruned.kind === 'condition') {
    // A disabled condition is a distinct state a reader can reach, so it must key
    // differently from the same condition enabled — otherwise toggling it off
    // wouldn't register as a change against what the author published.
    const off = pruned.enabled === false ? ':off' : '';
    return `c:${pruned.columnId}:${pruned.operator}:${pruned.values.join(' ')}${off}`;
  }
  return `g:${pruned.join}:[${pruned.children.map(filterKey).join(',')}]`;
}

export function countConditions(node: FilterNode | null): number {
  if (!node) return 0;
  return node.kind === 'condition' ? 1 : node.children.reduce((n, c) => n + countConditions(c), 0);
}

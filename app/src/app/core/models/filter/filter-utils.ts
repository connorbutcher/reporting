import { FilterGroup, FilterNode } from './filter.model';

/** Drops empty groups, so a half-built filter never narrows anything. */
export function pruneFilter(node: FilterNode | null): FilterNode | null {
  if (!node) return null;
  if (node.kind === 'condition') return node;

  const children = node.children.map(pruneFilter).filter((c): c is FilterNode => c !== null);
  return children.length === 0 ? null : { kind: 'group', join: node.join, children };
}

/** ANDs a report-level and a widget-level filter into the one tree sent to the API. */
export function combineFilters(...filters: (FilterNode | null)[]): FilterGroup | null {
  const parts = filters.map(pruneFilter).filter((f): f is FilterNode => f !== null);
  if (parts.length === 0) return null;
  return { kind: 'group', join: 'and', children: parts };
}

/**
 * A canonical string for comparing filters by meaning. Not `JSON.stringify`: the server omits the
 * `kind` of a root group and orders keys differently, which would read as a difference. Empty
 * groups collapse to nothing, so "no filter" equals "an empty group".
 */
export function filterKey(node: FilterNode | null): string {
  const pruned = pruneFilter(node);
  if (!pruned) return '';

  if (pruned.kind === 'condition') {
    // Disabled keys differently from enabled, so toggling one off registers as a change.
    const off = pruned.enabled === false ? ':off' : '';
    return `c:${pruned.columnId}:${pruned.operator}:${pruned.values.join(' ')}${off}`;
  }
  return `g:${pruned.join}:[${pruned.children.map(filterKey).join(',')}]`;
}

export function countConditions(node: FilterNode | null): number {
  if (!node) return 0;
  return node.kind === 'condition' ? 1 : node.children.reduce((n, c) => n + countConditions(c), 0);
}

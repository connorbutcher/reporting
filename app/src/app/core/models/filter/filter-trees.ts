import { FilterGroup } from './filter-group.model';
import { FilterNode } from './filter-node.model';

/** Pruning, combining and comparing filter trees. */
export class FilterTrees {
  /** Drops empty groups, so a half-built filter never narrows anything. */
  public static prune(node: FilterNode | null): FilterNode | null {
    if (!node) {
      return null;
    }
    if (node.kind === 'condition') {
      return node;
    }

    const children = node.children
      .map(FilterTrees.prune)
      .filter((c): c is FilterNode => c !== null);
    return children.length === 0 ? null : { kind: 'group', join: node.join, children };
  }

  /** ANDs a report-level and a widget-level filter into the one tree sent to the API. */
  public static combine(...filters: (FilterNode | null)[]): FilterGroup | null {
    const parts = filters.map(FilterTrees.prune).filter((f): f is FilterNode => f !== null);
    if (parts.length === 0) {
      return null;
    }
    return { kind: 'group', join: 'and', children: parts };
  }

  /**
   * A canonical key for comparing filters by meaning; the server's JSON differs in key order and root
   * `kind`. Empty groups collapse, so "no filter" equals "an empty group".
   */
  public static key(node: FilterNode | null): string {
    const pruned = FilterTrees.prune(node);
    if (!pruned) {
      return '';
    }

    if (pruned.kind === 'condition') {
      // Disabled keys differently from enabled, so toggling one off registers as a change.
      const off = pruned.enabled === false ? ':off' : '';
      return `c:${pruned.columnId}:${pruned.operator}:${pruned.values.join(' ')}${off}`;
    }
    return `g:${pruned.join}:[${pruned.children.map(FilterTrees.key).join(',')}]`;
  }

  public static countConditions(node: FilterNode | null): number {
    if (!node) {
      return 0;
    }
    return node.kind === 'condition'
      ? 1
      : node.children.reduce((n, c) => n + FilterTrees.countConditions(c), 0);
  }
}

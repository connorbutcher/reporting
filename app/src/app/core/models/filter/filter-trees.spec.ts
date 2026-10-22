import { describe, expect, it } from 'vitest';
import { FilterCondition } from './filter-condition.model';
import { FilterGroup } from './filter-group.model';
import { FilterNode } from './filter-node.model';
import { FilterTrees } from './filter-trees';

const c = (
  columnId: string,
  values: string[] = ['1'],
  extra: Partial<FilterCondition> = {},
): FilterCondition => ({
  kind: 'condition',
  columnId,
  operator: 'equals',
  values,
  ...extra,
});
const g = (join: 'and' | 'or', ...children: FilterNode[]): FilterGroup => ({
  kind: 'group',
  join,
  children,
});

describe('pruneFilter', () => {
  it('returns null for nothing and keeps a condition as is', () => {
    expect(FilterTrees.prune(null)).toBeNull();
    expect(FilterTrees.prune(c('a'))).toEqual(c('a'));
  });

  it('drops empty groups at any depth, so a half-built filter narrows nothing', () => {
    expect(FilterTrees.prune(g('and'))).toBeNull();
    expect(FilterTrees.prune(g('and', g('or'), g('and', g('or'))))).toBeNull();
    expect(FilterTrees.prune(g('and', g('or'), c('a')))).toEqual(g('and', c('a')));
  });
});

describe('combineFilters', () => {
  it('is null when nothing is left after pruning', () => {
    expect(FilterTrees.combine()).toBeNull();
    expect(FilterTrees.combine(null, g('and'))).toBeNull();
  });

  it('ANDs whatever remains, in order', () => {
    const report = g('or', c('a'));
    const widget = g('and', c('b'));

    expect(FilterTrees.combine(report, null, widget)).toEqual(g('and', report, widget));
  });

  it('wraps even a single filter', () => {
    expect(FilterTrees.combine(g('or', c('a')))).toEqual(g('and', g('or', c('a'))));
  });
});

describe('filterKey', () => {
  it('is empty for no filter and for an empty group alike', () => {
    expect(FilterTrees.key(null)).toBe('');
    expect(FilterTrees.key(g('and'))).toBe('');
    expect(FilterTrees.key(g('and', g('or')))).toBe('');
  });

  it('is the same for the same meaning, however the object was built', () => {
    expect(FilterTrees.key(g('and', c('a', ['x'])))).toBe(
      FilterTrees.key(g('and', { ...c('a', ['x']) })),
    );
  });

  it('differs by join, column, operator, values and order', () => {
    const keys = new Set([
      FilterTrees.key(g('and', c('a'))),
      FilterTrees.key(g('or', c('a'))),
      FilterTrees.key(g('and', c('b'))),
      FilterTrees.key(g('and', c('a', ['2']))),
      FilterTrees.key(g('and', { ...c('a'), operator: 'notEquals' })),
      FilterTrees.key(g('and', c('a'), c('b'))),
      FilterTrees.key(g('and', c('b'), c('a'))),
    ]);

    expect(keys.size).toBe(7);
  });

  it('tells a disabled condition from the same one enabled, but not an explicit enabled: true', () => {
    expect(FilterTrees.key(c('a', ['1'], { enabled: false }))).not.toBe(FilterTrees.key(c('a')));
    expect(FilterTrees.key(c('a', ['1'], { enabled: true }))).toBe(FilterTrees.key(c('a')));
  });
});

describe('countConditions', () => {
  it('counts conditions through nested groups', () => {
    expect(FilterTrees.countConditions(null)).toBe(0);
    expect(FilterTrees.countConditions(c('a'))).toBe(1);
    expect(FilterTrees.countConditions(g('and', c('a'), g('or', c('b'), c('c')), g('and')))).toBe(
      3,
    );
  });
});

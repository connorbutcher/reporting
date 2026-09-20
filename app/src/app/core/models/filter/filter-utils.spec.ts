import { describe, expect, it } from 'vitest';
import { FilterCondition, FilterGroup, FilterNode } from './filter.model';
import { combineFilters, countConditions, filterKey, pruneFilter } from './filter-utils';

const c = (columnId: string, values: string[] = ['1'], extra: Partial<FilterCondition> = {}): FilterCondition => ({
  kind: 'condition',
  columnId,
  operator: 'equals',
  values,
  ...extra,
});
const g = (join: 'and' | 'or', ...children: FilterNode[]): FilterGroup => ({ kind: 'group', join, children });

describe('pruneFilter', () => {
  it('returns null for nothing and keeps a condition as is', () => {
    expect(pruneFilter(null)).toBeNull();
    expect(pruneFilter(c('a'))).toEqual(c('a'));
  });

  it('drops empty groups at any depth, so a half-built filter narrows nothing', () => {
    expect(pruneFilter(g('and'))).toBeNull();
    expect(pruneFilter(g('and', g('or'), g('and', g('or'))))).toBeNull();
    expect(pruneFilter(g('and', g('or'), c('a')))).toEqual(g('and', c('a')));
  });
});

describe('combineFilters', () => {
  it('is null when nothing is left after pruning', () => {
    expect(combineFilters()).toBeNull();
    expect(combineFilters(null, g('and'))).toBeNull();
  });

  it('ANDs whatever remains, in order', () => {
    const report = g('or', c('a'));
    const widget = g('and', c('b'));

    expect(combineFilters(report, null, widget)).toEqual(g('and', report, widget));
  });

  it('wraps even a single filter', () => {
    expect(combineFilters(g('or', c('a')))).toEqual(g('and', g('or', c('a'))));
  });
});

describe('filterKey', () => {
  it('is empty for no filter and for an empty group alike', () => {
    expect(filterKey(null)).toBe('');
    expect(filterKey(g('and'))).toBe('');
    expect(filterKey(g('and', g('or')))).toBe('');
  });

  it('is the same for the same meaning, however the object was built', () => {
    expect(filterKey(g('and', c('a', ['x'])))).toBe(filterKey(g('and', { ...c('a', ['x']) })));
  });

  it('differs by join, column, operator, values and order', () => {
    const keys = new Set([
      filterKey(g('and', c('a'))),
      filterKey(g('or', c('a'))),
      filterKey(g('and', c('b'))),
      filterKey(g('and', c('a', ['2']))),
      filterKey(g('and', { ...c('a'), operator: 'notEquals' })),
      filterKey(g('and', c('a'), c('b'))),
      filterKey(g('and', c('b'), c('a'))),
    ]);

    expect(keys.size).toBe(7);
  });

  it('tells a disabled condition from the same one enabled, but not an explicit enabled: true', () => {
    expect(filterKey(c('a', ['1'], { enabled: false }))).not.toBe(filterKey(c('a')));
    expect(filterKey(c('a', ['1'], { enabled: true }))).toBe(filterKey(c('a')));
  });
});

describe('countConditions', () => {
  it('counts conditions through nested groups', () => {
    expect(countConditions(null)).toBe(0);
    expect(countConditions(c('a'))).toBe(1);
    expect(countConditions(g('and', c('a'), g('or', c('b'), c('c')), g('and')))).toBe(3);
  });
});

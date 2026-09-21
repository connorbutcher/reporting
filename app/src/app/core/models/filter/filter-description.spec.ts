import { describe, expect, it } from 'vitest';
import { DatasetColumn } from '../dataset';
import { describeFilter } from './filter-description';
import { FilterCondition, FilterGroup } from './filter.model';
import { OperatorCatalogue } from './operator-catalogue.model';

const columns: Pick<DatasetColumn, 'id' | 'name' | 'type'>[] = [
  { id: 'region', name: 'Region', type: 'string' },
  { id: 'qty', name: 'Quantity', type: 'int' },
];

const catalogue = {
  string: [{ value: 'equals', label: 'is', operandCount: 1, operandKind: 'text' }],
  int: [{ value: 'between', label: 'is between', operandCount: 2, operandKind: 'number' }],
} as unknown as OperatorCatalogue;

const cond = (columnId: string, operator: FilterCondition['operator'], values: string[], enabled?: boolean): FilterCondition => ({
  kind: 'condition',
  columnId,
  operator,
  values,
  enabled,
});
const group = (join: 'and' | 'or', ...children: FilterGroup['children']): FilterGroup => ({ kind: 'group', join, children });

describe('describeFilter', () => {
  it('is empty when there is no filter', () => {
    expect(describeFilter(null, columns, catalogue)).toEqual([]);
  });

  it('reads each condition of an AND tree as its own line, using the catalogue’s wording', () => {
    const filter = group('and', cond('region', 'equals', ['North']), cond('qty', 'between', ['1', '5']));

    expect(describeFilter(filter, columns, catalogue)).toEqual(['Region is North', 'Quantity is between 1 – 5']);
  });

  it('keeps an OR group together as one clause', () => {
    const filter = group('and', group('or', cond('region', 'equals', ['North']), cond('region', 'equals', ['South'])));

    expect(describeFilter(filter, columns, catalogue)).toEqual(['(Region is North or Region is South)']);
  });

  it('spells the operator out when the catalogue has not loaded', () => {
    expect(describeFilter(group('and', cond('qty', 'greaterThan', ['3'])), columns, null)).toEqual([
      'Quantity greater than 3',
    ]);
  });

  it('leaves out disabled conditions, unknown columns and duplicates', () => {
    const filter = group(
      'and',
      cond('region', 'equals', ['North'], false),
      cond('gone', 'equals', ['x']),
      cond('qty', 'isEmpty', []),
      cond('qty', 'isEmpty', []),
    );

    expect(describeFilter(filter, columns, null)).toEqual(['Quantity is empty']);
  });
});

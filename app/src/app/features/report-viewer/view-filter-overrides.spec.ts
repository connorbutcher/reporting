import { describe, expect, it } from 'vitest';
import { FilterGroup } from '../../core/models/filter';
import {
  ViewFilterOverrides,
  decodeViewFilterOverrides,
  encodeViewFilterOverrides,
} from './view-filter-overrides';

const equals = (columnId: string, ...values: string[]): FilterGroup['children'][number] => ({
  kind: 'condition',
  columnId,
  operator: 'equals',
  values,
});

function group(join: 'and' | 'or', ...children: FilterGroup['children']): FilterGroup {
  return { kind: 'group', join, children };
}

function roundTrip(overrides: ViewFilterOverrides): ViewFilterOverrides | null {
  return decodeViewFilterOverrides(encodeViewFilterOverrides(overrides));
}

function encodeRaw(value: unknown): string {
  return btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

describe('view filter overrides codec', () => {
  it('writes no param when there are no overrides', () => {
    expect(encodeViewFilterOverrides({})).toBeNull();
  });

  it('reads an absent param as no overrides', () => {
    expect(decodeViewFilterOverrides(null)).toEqual({});
    expect(decodeViewFilterOverrides('')).toEqual({});
  });

  it('round-trips a group, keeping the join and operands', () => {
    const overrides = { '12': group('or', equals('status', 'Open'), equals('site', 'A', 'B')) };
    expect(roundTrip(overrides)).toEqual(overrides);
  });

  it('round-trips a nested group', () => {
    const overrides = { w1: group('and', equals('a', '1'), group('or', equals('b', '2'), equals('c', '3'))) };
    expect(roundTrip(overrides)).toEqual(overrides);
  });

  it('keeps a cleared filter as an explicit null', () => {
    const overrides = { '12': null, w1: group('and', equals('a', '1')) };
    expect(roundTrip(overrides)).toEqual(overrides);
  });

  it('keeps a disabled condition disabled, and an enabled one without the flag', () => {
    const disabled = { ...(equals('a', '1') as object), enabled: false } as FilterGroup['children'][number];
    const decoded = roundTrip({ w1: group('and', disabled, equals('b', '2')) });

    expect(decoded?.['w1']?.children).toEqual([disabled, equals('b', '2')]);
  });

  it('survives non-ASCII operands', () => {
    const overrides = { w1: group('and', equals('name', 'Zoë — 日本')) };
    expect(roundTrip(overrides)).toEqual(overrides);
  });

  it('produces only URL-safe characters', () => {
    const encoded = encodeViewFilterOverrides({ w1: group('and', equals('a', '???>>>~~~')) });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('is smaller than the raw DTO JSON', () => {
    const overrides = { w1: group('and', equals('status', 'Open'), equals('site', 'A')) };
    expect(encodeViewFilterOverrides(overrides)!.length).toBeLessThan(
      btoa(JSON.stringify(overrides)).length,
    );
  });

  describe('a malformed param', () => {
    const malformed: Record<string, string> = {
      'not base64': '!!!not-base64!!!',
      'not JSON': encodeRaw('plain text').slice(0, 6),
      'JSON that is not an object': encodeRaw([1, 2]),
      'a group with an unknown join': encodeRaw({ w1: { j: 'x', c: [] } }),
      'a group without children': encodeRaw({ w1: { j: 'a' } }),
      'a condition with a non-string column': encodeRaw({ w1: { j: 'a', c: [[1, 'equals', []]] } }),
      'a condition with non-string operands': encodeRaw({ w1: { j: 'a', c: [['a', 'equals', [1]]] } }),
      'a condition with a bad enabled flag': encodeRaw({ w1: { j: 'a', c: [['a', 'equals', [], 1]] } }),
      'an entry that is not a group': encodeRaw({ w1: 'oops' }),
    };

    for (const [name, raw] of Object.entries(malformed)) {
      it(`is rejected as a whole: ${name}`, () => {
        expect(decodeViewFilterOverrides(raw)).toBeNull();
      });
    }

    it('is rejected when groups nest deeper than a reader could build', () => {
      let nested: unknown = { j: 'a', c: [] };
      for (let i = 0; i < 20; i++) nested = { j: 'a', c: [nested] };
      expect(decodeViewFilterOverrides(encodeRaw({ w1: nested }))).toBeNull();
    });

    it('rejects the whole param when only one entry is bad', () => {
      const raw = encodeRaw({ w1: { j: 'a', c: [] }, w2: 'oops' });
      expect(decodeViewFilterOverrides(raw)).toBeNull();
    });
  });
});

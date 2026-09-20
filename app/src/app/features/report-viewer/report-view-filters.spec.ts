import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { DatasetSchema } from '../../core/models/dataset';
import { FilterGroup, OperatorCatalogue } from '../../core/models/filter';
import { ReportRevisionContent } from '../../core/models/report';
import { ReportViewFilters } from './report-view-filters';
import { ViewFilterOverrides } from './view-filter-overrides';

const condition = (columnId: string, value: string): FilterGroup['children'][number] => ({
  kind: 'condition',
  columnId,
  operator: 'equals',
  values: [value],
});

const group = (...children: FilterGroup['children']): FilterGroup => ({
  kind: 'group',
  join: 'and',
  children,
});

/** A one-tab report: table `w1` on dataset 7 with a published filter, table `w2` on dataset 8 with none. */
function content(): ReportRevisionContent {
  const table = (id: string, datasetId: number, filter: FilterGroup | null) => ({
    id,
    type: 'dataTable',
    config: { type: 'dataTable', datasetId, title: id, columns: [], filter },
  });

  return {
    reportId: 1,
    name: 'Report',
    notes: null,
    filters: [{ datasetId: 7, filter: group(condition('site', 'North')) }],
    tabs: [
      {
        id: 't1',
        name: 'Tab',
        order: 0,
        columns: 12,
        rows: 12,
        widgets: [table('w1', 7, group(condition('status', 'Open'))), table('w2', 8, null)],
      },
    ],
  } as unknown as ReportRevisionContent;
}

function build(overrides?: ViewFilterOverrides): ReportViewFilters {
  return new ReportViewFilters(content(), signal({}), signal(null), overrides);
}

/** With dataset 7's schema and the operator catalogue loaded, so a row can tell it's missing an operand. */
function buildLoaded(): ReportViewFilters {
  const column = (id: string) => ({ id, name: id, type: 'string', order: 0, configuration: {} });
  const schemas = { 7: { id: 7, name: 'Dataset', columns: [column('status'), column('site')] } };
  const catalogue = {
    string: [{ value: 'equals', label: 'is', operandCount: 1, operandKind: 'text' }],
  };
  return new ReportViewFilters(
    content(),
    signal(schemas as unknown as Record<number, DatasetSchema>),
    signal(catalogue as unknown as OperatorCatalogue),
  );
}

function entry(filters: ReportViewFilters, key: string) {
  return [...filters.pageEntries, ...filters.widgetEntries].find((e) => e.key === key)!;
}

describe('ReportViewFilters overrides', () => {
  it('has an empty snapshot until the reader changes something', () => {
    expect(build().snapshot()).toEqual({});
  });

  it('snapshots only the entries the reader changed', () => {
    const filters = build();
    entry(filters, 'w2').group.replaceWith(group(condition('site', 'South')));

    expect(filters.snapshot()).toEqual({ w2: group(condition('site', 'South')) });
  });

  it('snapshots a filter the reader cleared as null, not as absent', () => {
    const filters = build();
    entry(filters, 'w1').group.clear();

    expect(filters.snapshot()).toEqual({ w1: null });
  });

  it('keeps a disabled condition in the snapshot', () => {
    const filters = build();
    entry(filters, 'w1').group.children()[0].setEnabled(false);

    const [only] = (filters.snapshot()['w1'] as FilterGroup).children;
    expect(only).toMatchObject({ columnId: 'status', enabled: false });
  });

  it('seeds entries from the overrides it is built with', () => {
    const filters = build({ w2: group(condition('site', 'South')), '7': null });

    expect(entry(filters, 'w2').group.toDto()).toEqual(group(condition('site', 'South')));
    expect(entry(filters, '7').group.toDto()).toBeNull();
    expect(filters.changed()).toBe(true);
  });

  it('leaves entries without an override on the published filter', () => {
    const filters = build({ w2: group(condition('site', 'South')) });

    expect(entry(filters, 'w1').group.toDto()).toEqual(group(condition('status', 'Open')));
    expect(entry(filters, 'w1').published).toEqual(group(condition('status', 'Open')));
  });

  it('ignores an override naming an entry this version does not have', () => {
    const filters = build({ gone: group(condition('a', '1')) });

    expect(filters.snapshot()).toEqual({});
  });

  describe('a row still being typed', () => {
    it('is left out of the snapshot, though the panel still shows the entry as changed', () => {
      const filters = buildLoaded();
      entry(filters, 'w1').group.replaceWith(
        group(condition('status', 'Open'), condition('site', '')),
      );

      expect(filters.snapshot()).toEqual({});
      expect(filters.changed()).toBe(true);
    });

    it('joins the snapshot once it has its operand', () => {
      const filters = buildLoaded();
      entry(filters, 'w1').group.replaceWith(
        group(condition('status', 'Open'), condition('site', '')),
      );

      entry(filters, 'w1').group.children()[1].setValue(0, 'North');

      expect(filters.snapshot()).toEqual({
        w1: group(condition('status', 'Open'), condition('site', 'North')),
      });
    });

  });

  describe('unmatched', () => {
    it('lists the override keys that name no filter in this version', () => {
      const filters = build();

      const unmatched = filters.unmatched({
        w1: null,
        '8': group(condition('a', '1')),
        ghost: group(condition('a', '1')),
        '999': null,
      });

      expect([...unmatched].sort()).toEqual(['999', 'ghost']);
    });

    it('is empty when every key is a filter this version has', () => {
      expect(build().unmatched({ w1: null, w2: group(condition('a', '1')) })).toEqual([]);
    });
  });

  it('round-trips: a snapshot applied to fresh filters reproduces the same snapshot', () => {
    const edited = build();
    entry(edited, 'w2').group.replaceWith(group(condition('site', 'South')));
    entry(edited, 'w1').group.clear();

    expect(build(edited.snapshot()).snapshot()).toEqual(edited.snapshot());
  });

  describe('apply', () => {
    it('sets changed entries and puts the rest back to published', () => {
      const filters = build({ w2: group(condition('site', 'South')) });

      filters.apply({ w1: null });

      expect(entry(filters, 'w2').group.toDto()).toBeNull();
      expect(entry(filters, 'w1').group.toDto()).toBeNull();
    });

    it('applying nothing is a reset', () => {
      const filters = build({ w1: null, w2: group(condition('site', 'South')) });

      filters.apply({});

      expect(filters.changed()).toBe(false);
      expect(filters.snapshot()).toEqual({});
    });

    it('leaves an entry already showing the target untouched', () => {
      const filters = build({ w2: group(condition('site', 'South')) });
      const before = entry(filters, 'w2').group.children();

      filters.apply({ w2: group(condition('site', 'South')) });

      expect(entry(filters, 'w2').group.children()).toBe(before);
    });
  });
});

import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { DatasetSchema } from '../../../core/models/dataset';
import { FilterGroup, OperatorCatalogue } from '../../../core/models/filter';
import { ReportRevisionContent } from '../../../core/models/report';
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
  const table = (id: string, datasetId: number, filter: FilterGroup | null, x = 0) => ({
    id,
    type: 'dataTable',
    x,
    y: 0,
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
        widgets: [table('w1', 7, group(condition('status', 'Open')), 0), table('w2', 8, null, 6)],
      },
    ],
  } as unknown as ReportRevisionContent;
}

function build(overrides?: ViewFilterOverrides): ReportViewFilters {
  return new ReportViewFilters(content(), signal({}), signal(null), overrides);
}

/** With dataset 7's schema and the operator catalogue loaded, so a row can tell it's missing an operand. */
function buildLoaded(overrides?: ViewFilterOverrides): ReportViewFilters {
  const column = (id: string) => ({ id, name: id, type: 'string', order: 0, configuration: {} });
  const schemas = { 7: { id: 7, name: 'Dataset', columns: [column('status'), column('site')] } };
  const catalogue = {
    string: [{ value: 'equals', label: 'is', operandCount: 1, operandKind: 'text' }],
  };
  return new ReportViewFilters(
    content(),
    signal(schemas as unknown as Record<number, DatasetSchema>),
    signal(catalogue as unknown as OperatorCatalogue),
    overrides,
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

  describe('ready', () => {
    const column = (id: string) => ({ id, name: id, type: 'string', order: 0, configuration: {} });
    const dataset = (id: number) => ({ id, name: `Dataset ${id}`, columns: [column('status')] });
    const catalogue = { string: [{ value: 'equals', label: 'is', operandCount: 1, operandKind: 'text' }] };
    const readyWith = (schemas: object, loaded: boolean) =>
      new ReportViewFilters(
        content(),
        signal(schemas as Record<number, DatasetSchema>),
        signal(loaded ? (catalogue as unknown as OperatorCatalogue) : null),
      );

    it('is false until every dataset’s schema and the operators are in', () => {
      expect(build().ready()).toBe(false);
      expect(readyWith({ 7: dataset(7) }, true).ready()).toBe(false);
      expect(readyWith({ 7: dataset(7), 8: dataset(8) }, false).ready()).toBe(false);
    });

    it('is true once they all are', () => {
      expect(readyWith({ 7: dataset(7), 8: dataset(8) }, true).ready()).toBe(true);
    });
  });

  describe('a condition on a column that no longer exists', () => {
    const onGone = group(condition('gone', 'x'));

    it('is not mistaken for missing while the schema is still loading', () => {
      const filters = build({ w1: onGone });

      expect(filters.missingColumnCount()).toBe(0);
      expect(filters.widgetFilters.get('w1')!()).toEqual(onGone);
    });

    it('is counted, and left out of what the widget queries, once the schema is in', () => {
      const filters = buildLoaded({ w1: onGone });

      expect(filters.missingColumnCount()).toBe(1);
      expect(filters.widgetFilters.get('w1')!()).toBeNull();
    });

    it('stays in the reader’s filters (and snapshot), so nothing they set is lost', () => {
      const filters = buildLoaded({ w1: onGone });

      expect(entry(filters, 'w1').group.toDto()).toEqual(onGone);
      expect(filters.snapshot()).toEqual({ w1: onGone });
    });

    it('does not count a switched-off condition — it never ran anyway', () => {
      const filters = buildLoaded({ w1: onGone });
      entry(filters, 'w1').group.children()[0].setEnabled(false);

      expect(filters.missingColumnCount()).toBe(0);
    });

    it('leaves conditions on columns that exist applying', () => {
      const both = group(condition('status', 'Open'), condition('gone', 'x'));
      const filters = buildLoaded({ w1: both });

      expect(filters.widgetFilters.get('w1')!()).toEqual(group(condition('status', 'Open')));
    });
  });

  describe('widgets as the panel lists them', () => {
    const binding = (id: string, datasetId: number, label = '') => ({
      id,
      datasetId,
      label,
      xColumnId: null,
      yColumnId: null,
      filter: null,
    });
    const chart = (id: string, title: string, bindings: ReturnType<typeof binding>[]) => ({
      id,
      type: 'scatterChart',
      config: { type: 'scatterChart', title, bindings, toleranceBands: [] },
    });

    /** A table (w1), a chart overlaying two datasets (c1), and a chart on one (c2), across two tabs. */
    function buildMixed(schemas: Record<number, unknown> = {}): ReportViewFilters {
      const base = content();
      const table = (base.tabs[0].widgets as unknown[])[0];
      const mixed = {
        ...base,
        tabs: [
          { ...base.tabs[0], widgets: [table, chart('c1', 'Cost vs Time', [binding('b1', 7, 'Cost'), binding('b2', 8)])] },
          { ...base.tabs[0], id: 't2', name: 'Second', order: 1, widgets: [chart('c2', 'Solo', [binding('b3', 7)])] },
        ],
      } as unknown as ReportRevisionContent;
      return new ReportViewFilters(mixed, signal(schemas as Record<number, DatasetSchema>), signal(null));
    }

    it('lists a multi-dataset chart once, not once per dataset', () => {
      const items = buildMixed().widgetItems;

      expect(items.map((i) => i.widget.id)).toEqual(['w1', 'c1', 'c2']);
      expect(items.find((i) => i.widget.id === 'c1')!.entries.map((e) => e.key)).toEqual(['c1::b1', 'c1::b2']);
    });

    it('keeps a single-dataset widget as one item with one entry', () => {
      const items = buildMixed().widgetItems;

      expect(items.find((i) => i.widget.id === 'w1')!.entries).toHaveLength(1);
      expect(items.find((i) => i.widget.id === 'c2')!.entries).toHaveLength(1);
    });

    it('titles the widget without any dataset suffix, and keeps its tab and icon', () => {
      const [, multi, solo] = buildMixed().widgetItems;

      expect(multi.widget.title).toBe('Cost vs Time');
      expect(multi.widget.tabName).toBe('Tab');
      expect(solo.widget.tabName).toBe('Second');
      expect(multi.widget.icon).toBeTruthy();
    });

    it('offers each dataset by its series label, falling back to the dataset’s name', () => {
      const schemas = { 8: { id: 8, name: 'Torque', columns: [] } };
      const multi = buildMixed(schemas).widgetItems[1];

      expect(multi.options().map((o) => o.label)).toEqual(['Cost', 'Torque']);
      expect(multi.options().map((o) => o.key)).toEqual(['c1::b1', 'c1::b2']);
    });

    it('shows how many conditions each dataset carries', () => {
      const schemas = { 8: { id: 8, name: 'Torque', columns: [] } };
      const filters = buildMixed(schemas);
      const multi = filters.widgetItems[1];
      entry(filters, 'c1::b2').group.replaceWith(group(condition('a', '1'), condition('b', '2')));

      expect(multi.options().map((o) => o.label)).toEqual(['Cost', 'Torque · 2 conditions']);
    });

    it('numbers two series that would otherwise read the same', () => {
      const base = content();
      const twin = {
        ...base,
        tabs: [{ ...base.tabs[0], widgets: [chart('c1', 'Twins', [binding('b1', 7), binding('b2', 7)])] }],
      } as unknown as ReportRevisionContent;
      const schemas = { 7: { id: 7, name: 'Bearings', columns: [] } } as unknown as Record<number, DatasetSchema>;
      const filters = new ReportViewFilters(twin, signal(schemas), signal(null));

      expect(filters.widgetItems[0].options().map((o) => o.label)).toEqual([
        'Bearings (series 1)',
        'Bearings (series 2)',
      ]);
    });

    it('summarises a widget across all its datasets, so a collapsed row never hides one being filtered', () => {
      const filters = buildMixed();
      const multi = filters.widgetItems[1];
      entry(filters, 'c1::b2').group.replaceWith(group(condition('a', '1'), condition('b', '2')));
      entry(filters, 'c1::b1').group.replaceWith(group(condition('c', '3')));

      expect(multi.summary()).toBe('3 conditions');
    });

    it('marks a widget changed when only a dataset not being shown was edited', () => {
      const filters = buildMixed();
      entry(filters, 'c1::b2').group.replaceWith(group(condition('a', '1')));

      expect(filters.widgetItems[1].changed()).toBe(true);
      expect(filters.widgetItems[0].changed()).toBe(false);
    });

    it('still keys each dataset’s filter separately, so saved and shared filters are unaffected', () => {
      const filters = buildMixed();
      entry(filters, 'c1::b2').group.replaceWith(group(condition('a', '1')));

      expect(Object.keys(filters.snapshot())).toEqual(['c1::b2']);
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

import { beforeEach, describe, expect, it } from 'vitest';
import { FilterGroup } from '../../../core/models/filter';
import { ViewFilterOverrideCodec } from './view-filter-override-codec';
import { ViewerFixtures } from './testing/viewer-fixtures';
import { ViewerHarness } from './testing/viewer-harness';

describe('ViewFilterSession: saving and sharing', () => {
  const h = ViewerHarness.use();

  describe('saving', () => {
    it('saves the reader’s own edit, even on top of a link’s filters', async () => {
      await h.open('/reports/3?view=abc', {
        saved: ViewerFixtures.encode('saved'),
        views: { abc: ViewerFixtures.encode('link') },
      });

      await h.edit('mine');

      expect(h.writes()).toHaveLength(1);
      expect(h.writes()[0].method).toBe('PUT');
      expect(h.writes()[0].url).toBe('/api/reports/3/view-filters');
      expect(
        ViewFilterOverrideCodec.decode((h.writes()[0].body as { filters: string }).filters),
      ).toEqual({
        w1: ViewerFixtures.group('mine'),
      });
    });

    it('forgets the saved filters when the reader puts everything back to the published ones', async () => {
      await h.open('/reports/3', { saved: ViewerFixtures.encode('saved') });

      await h.edit(null);

      expect(h.writes().map((w) => w.method)).toEqual(['DELETE']);
    });

    it('saves a return to the loaded value, because the last save was something else', async () => {
      await h.open('/reports/3', { saved: ViewerFixtures.encode('saved') });

      await h.edit('other');
      const before = h.writes().length;
      await h.edit('saved');

      expect(
        h
          .writes()
          .slice(before)
          .map((w) => w.method),
      ).toEqual(['PUT']);
    });

    it('applies filters from an outside change to the URL without saving them', async () => {
      await h.open('/reports/3?view=abc', {
        views: { abc: ViewerFixtures.encode('first'), def: ViewerFixtures.encode('second') },
      });

      // Same route, new query param: the component is kept and the new link is applied.
      await h.navigate('/reports/3?view=def');
      await h.settleEdits();

      expect(h.shown()).toEqual(ViewerFixtures.group('second'));
      expect(h.session.sharedLink()).toEqual({ total: 1, unmatched: 0, missingColumns: 0 });
      expect(h.writes()).toEqual([]);
    });
  });

  describe('a published filter that is unfinished once the schema is known', () => {
    // Whether a row is finished depends on the schema and operators, which load after the filters
    // are built: the loading itself must not read as the reader clearing what the author published.
    it('is not mistaken for an edit, so nothing is saved', async () => {
      await h.open('/reports/3', { publishedBlankFilter: true });
      await h.settleEdits();

      expect(h.writes()).toEqual([]);
    });

    it('does not take a shared link out of the URL', async () => {
      await h.open('/reports/3?view=abc', {
        publishedBlankFilter: true,
        views: { abc: ViewerFixtures.encode('link') },
      });
      await h.settleEdits();

      expect(h.url()).toContain('view=abc');
      expect(h.session.sharedLink()).not.toBeNull();
      expect(h.writes()).toEqual([]);
    });
  });

  describe('a row still being typed', () => {
    const blank = (): FilterGroup => ViewerFixtures.group('');

    it('is not saved, but is once it has its value', async () => {
      await h.open('/reports/3');

      h.session.viewFilters()!.widgetEntries[0].group.replaceWith(blank());
      await h.settleEdits();
      expect(h.writes()).toEqual([]);

      h.session.viewFilters()!.widgetEntries[0].group.children()[0].setValue(0, 'typed');
      await h.settleEdits();
      expect(h.writes().map((w) => w.method)).toEqual(['PUT']);
    });
  });

  describe('copying a link', () => {
    let copied: string[];

    beforeEach(() => {
      copied = [];
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (text: string) => void copied.push(text) },
        configurable: true,
      });
    });

    it('shares the filters for a short id, and the link carries only that id', async () => {
      await h.open('/reports/3', { saved: ViewerFixtures.encode('saved') });

      await h.copyLink();

      const shares = h.writes().filter((w) => w.url.endsWith('/shared-views'));
      expect(shares).toHaveLength(1);
      expect(
        ViewFilterOverrideCodec.decode((shares[0].body as { filters: string }).filters),
      ).toEqual({
        w1: ViewerFixtures.group('saved'),
      });
      expect(copied).toHaveLength(1);
      expect(copied[0]).toContain('view=newlink123');
      expect(copied[0]).not.toContain(ViewerFixtures.encode('saved'));
      expect(h.notify.success).toHaveBeenCalled();
    });

    it('makes a plain link when the reader has no changes from the published filters', async () => {
      await h.open('/reports/3');

      await h.copyLink();

      expect(h.writes()).toEqual([]);
      expect(copied[0]).not.toContain('view=');
    });

    it('replaces a link’s id in the address with the id for what the reader is looking at now', async () => {
      await h.open('/reports/3?view=abc', { views: { abc: ViewerFixtures.encode('link') } });
      await h.edit('mine');

      await h.copyLink();

      expect(copied[0]).toContain('view=newlink123');
      expect(copied[0]).not.toContain('view=abc');
    });
  });
});

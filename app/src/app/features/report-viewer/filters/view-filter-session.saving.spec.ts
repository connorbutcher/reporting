import { beforeEach, describe, expect, it } from 'vitest';
import { FilterGroup } from '../../../core/models/filter';
import { decodeViewFilterOverrides } from './view-filter-overrides';
import { encode, group, useViewerHarness } from './testing/viewer-harness';

describe('ViewFilterSession: saving and sharing', () => {
  const h = useViewerHarness();
  const { open, edit, settleEdits, copyLink, shown, writes, navigate } = h;

  describe('saving', () => {
    it('saves the reader’s own edit, even on top of a link’s filters', async () => {
      await open('/reports/3?view=abc', { saved: encode('saved'), views: { abc: encode('link') } });

      await edit('mine');

      expect(writes()).toHaveLength(1);
      expect(writes()[0].method).toBe('PUT');
      expect(writes()[0].url).toBe('/api/reports/3/view-filters');
      expect(decodeViewFilterOverrides((writes()[0].body as { filters: string }).filters)).toEqual({
        w1: group('mine'),
      });
    });

    it('forgets the saved filters when the reader puts everything back to the published ones', async () => {
      await open('/reports/3', { saved: encode('saved') });

      await edit(null);

      expect(writes().map((w) => w.method)).toEqual(['DELETE']);
    });

    it('saves a return to the loaded value, because the last save was something else', async () => {
      await open('/reports/3', { saved: encode('saved') });

      await edit('other');
      const before = writes().length;
      await edit('saved');

      expect(writes().slice(before).map((w) => w.method)).toEqual(['PUT']);
    });

    it('applies filters from an outside change to the URL without saving them', async () => {
      await open('/reports/3?view=abc', { views: { abc: encode('first'), def: encode('second') } });

      // Same route, new query param: the component is kept and the new link is applied.
      await navigate('/reports/3?view=def');
      await settleEdits();

      expect(shown()).toEqual(group('second'));
      expect(h.session.sharedLink()).toEqual({ total: 1, unmatched: 0, missingColumns: 0 });
      expect(writes()).toEqual([]);
    });
  });

  describe('a published filter that is unfinished once the schema is known', () => {
    // Whether a row is finished depends on the schema and operators, which load after the filters
    // are built: the loading itself must not read as the reader clearing what the author published.
    it('is not mistaken for an edit, so nothing is saved', async () => {
      await open('/reports/3', { publishedBlankFilter: true });
      await settleEdits();

      expect(writes()).toEqual([]);
    });

    it('does not take a shared link out of the URL', async () => {
      await open('/reports/3?view=abc', { publishedBlankFilter: true, views: { abc: encode('link') } });
      await settleEdits();

      expect(h.url()).toContain('view=abc');
      expect(h.session.sharedLink()).not.toBeNull();
      expect(writes()).toEqual([]);
    });
  });

  describe('a row still being typed', () => {
    const blank = (): FilterGroup => group('');

    it('is not saved, but is once it has its value', async () => {
      await open('/reports/3');

      h.session.viewFilters()!.widgetEntries[0].group.replaceWith(blank());
      await settleEdits();
      expect(writes()).toEqual([]);

      h.session.viewFilters()!.widgetEntries[0].group.children()[0].setValue(0, 'typed');
      await settleEdits();
      expect(writes().map((w) => w.method)).toEqual(['PUT']);
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
      await open('/reports/3', { saved: encode('saved') });

      await copyLink();

      const shares = writes().filter((w) => w.url.endsWith('/shared-views'));
      expect(shares).toHaveLength(1);
      expect(decodeViewFilterOverrides((shares[0].body as { filters: string }).filters)).toEqual({
        w1: group('saved'),
      });
      expect(copied).toHaveLength(1);
      expect(copied[0]).toContain('view=newlink123');
      expect(copied[0]).not.toContain(encode('saved'));
      expect(h.notify.success).toHaveBeenCalled();
    });

    it('makes a plain link when the reader has no changes from the published filters', async () => {
      await open('/reports/3');

      await copyLink();

      expect(writes()).toEqual([]);
      expect(copied[0]).not.toContain('view=');
    });

    it('replaces a link’s id in the address with the id for what the reader is looking at now', async () => {
      await open('/reports/3?view=abc', { views: { abc: encode('link') } });
      await edit('mine');

      await copyLink();

      expect(copied[0]).toContain('view=newlink123');
      expect(copied[0]).not.toContain('view=abc');
    });
  });
});

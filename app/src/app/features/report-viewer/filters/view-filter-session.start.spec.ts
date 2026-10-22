import { describe, expect, it } from 'vitest';
import { ViewFilterOverrideCodec } from './view-filter-override-codec';
import { ViewerFixtures } from './testing/viewer-fixtures';
import { ViewerHarness } from './testing/viewer-harness';

describe('ViewFilterSession: where the filters start, and the banner', () => {
  const h = ViewerHarness.use();

  describe('where the filters start', () => {
    it('is the published filters when there is no link and nothing saved', async () => {
      await h.open('/reports/3');

      expect(h.shown()).toBeNull();
      expect(h.session.sharedLink()).toBeNull();
      expect(h.writes()).toEqual([]);
    });

    it('is the saved filters when opened without a link, without re-saving them', async () => {
      await h.open('/reports/3', { saved: ViewerFixtures.encode('saved') });
      await h.settleEdits();

      expect(h.shown()).toEqual(ViewerFixtures.group('saved'));
      expect(h.session.sharedLink()).toBeNull();
      expect(h.writes()).toEqual([]);
    });

    it("is a link's filters, ahead of saved ones, leaving what was saved alone", async () => {
      await h.open('/reports/3?view=abc', {
        saved: ViewerFixtures.encode('saved'),
        views: { abc: ViewerFixtures.encode('link') },
      });
      await h.settleEdits();

      expect(h.shown()).toEqual(ViewerFixtures.group('link'));
      expect(h.writes()).toEqual([]);
      expect(h.url()).toContain('view=abc');
    });

    it('never puts filter data in the URL — only the short id', async () => {
      await h.open('/reports/3?view=abc', { views: { abc: ViewerFixtures.encode('link') } });
      await h.edit('mine');

      expect(h.url()).not.toContain('filters');
      expect(h.url()).not.toContain(ViewerFixtures.encode('mine'));
    });

    it('falls back to the reader’s own filters, and says so, when the link has no snapshot', async () => {
      await h.open('/reports/3?view=gone', { saved: ViewerFixtures.encode('saved') });
      await h.settleEdits();

      expect(h.shown()).toEqual(ViewerFixtures.group('saved'));
      expect(h.session.sharedLink()).toBeNull();
      expect(h.notify.warn).toHaveBeenCalledTimes(1);
      expect(h.url()).not.toContain('view=');
      expect(h.writes()).toEqual([]);
    });
  });

  describe('the shared-link banner', () => {
    it('is up while a link’s filters are showing, counting what it carried', async () => {
      await h.open('/reports/3?view=abc', { views: { abc: ViewerFixtures.encode('link') } });

      expect(h.session.sharedLink()).toEqual({ total: 1, unmatched: 0, missingColumns: 0 });
    });

    it('counts filters naming a widget this version does not have as unmatched', async () => {
      const view = ViewFilterOverrideCodec.encode({
        w1: ViewerFixtures.group('link'),
        ghost: ViewerFixtures.group('x'),
        '404': null,
      })!;
      await h.open('/reports/3?view=abc', { views: { abc: view } });

      expect(h.session.sharedLink()).toEqual({ total: 3, unmatched: 2, missingColumns: 0 });
      expect(h.shown()).toEqual(ViewerFixtures.group('link'));
    });

    it('goes when the reader edits, and the link’s id leaves the URL', async () => {
      await h.open('/reports/3?view=abc', { views: { abc: ViewerFixtures.encode('link') } });

      await h.edit('mine');

      expect(h.session.sharedLink()).toBeNull();
      expect(h.url()).not.toContain('view=');
    });

    it('"Save as mine" saves the link’s filters and takes the link out of the URL', async () => {
      await h.open('/reports/3?view=abc', {
        saved: ViewerFixtures.encode('saved'),
        views: { abc: ViewerFixtures.encode('link') },
      });

      h.session.saveLinkAsMine();
      await h.settleEdits();

      expect(h.writes().map((w) => w.method)).toEqual(['PUT']);
      expect(
        ViewFilterOverrideCodec.decode((h.writes()[0].body as { filters: string }).filters),
      ).toEqual({
        w1: ViewerFixtures.group('link'),
      });
      expect(h.session.sharedLink()).toBeNull();
      expect(h.url()).not.toContain('view=');
      expect(h.shown()).toEqual(ViewerFixtures.group('link'));
    });

    it('"Back to mine" shows the saved filters again without saving anything', async () => {
      await h.open('/reports/3?view=abc', {
        saved: ViewerFixtures.encode('saved'),
        views: { abc: ViewerFixtures.encode('link') },
      });

      h.session.discardLink();
      await h.settleEdits();

      expect(h.shown()).toEqual(ViewerFixtures.group('saved'));
      expect(h.session.sharedLink()).toBeNull();
      expect(h.url()).not.toContain('view=');
      expect(h.writes()).toEqual([]);
    });
  });
});

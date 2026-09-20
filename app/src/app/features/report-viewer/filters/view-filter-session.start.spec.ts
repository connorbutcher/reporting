import { describe, expect, it } from 'vitest';
import { decodeViewFilterOverrides, encodeViewFilterOverrides } from './view-filter-overrides';
import { encode, group, useViewerHarness } from './testing/viewer-harness';

describe('ViewFilterSession: where the filters start, and the banner', () => {
  const h = useViewerHarness();
  const { open, edit, settleEdits, shown, writes, url } = h;

  describe('where the filters start', () => {
    it('is the published filters when there is no link and nothing saved', async () => {
      await open('/reports/3');

      expect(shown()).toBeNull();
      expect(h.session.sharedLink()).toBeNull();
      expect(writes()).toEqual([]);
    });

    it('is the saved filters when opened without a link, without re-saving them', async () => {
      await open('/reports/3', { saved: encode('saved') });
      await settleEdits();

      expect(shown()).toEqual(group('saved'));
      expect(h.session.sharedLink()).toBeNull();
      expect(writes()).toEqual([]);
    });

    it("is a link's filters, ahead of saved ones, leaving what was saved alone", async () => {
      await open('/reports/3?view=abc', { saved: encode('saved'), views: { abc: encode('link') } });
      await settleEdits();

      expect(shown()).toEqual(group('link'));
      expect(writes()).toEqual([]);
      expect(url()).toContain('view=abc');
    });

    it('never puts filter data in the URL — only the short id', async () => {
      await open('/reports/3?view=abc', { views: { abc: encode('link') } });
      await edit('mine');

      expect(url()).not.toContain('filters');
      expect(url()).not.toContain(encode('mine'));
    });

    it('falls back to the reader’s own filters, and says so, when the link has no snapshot', async () => {
      await open('/reports/3?view=gone', { saved: encode('saved') });
      await settleEdits();

      expect(shown()).toEqual(group('saved'));
      expect(h.session.sharedLink()).toBeNull();
      expect(h.notify.warn).toHaveBeenCalledTimes(1);
      expect(url()).not.toContain('view=');
      expect(writes()).toEqual([]);
    });
  });

  describe('the shared-link banner', () => {
    it('is up while a link’s filters are showing, counting what it carried', async () => {
      await open('/reports/3?view=abc', { views: { abc: encode('link') } });

      expect(h.session.sharedLink()).toEqual({ total: 1, unmatched: 0, missingColumns: 0 });
    });

    it('counts filters naming a widget this version does not have as unmatched', async () => {
      const view = encodeViewFilterOverrides({ w1: group('link'), ghost: group('x'), '404': null })!;
      await open('/reports/3?view=abc', { views: { abc: view } });

      expect(h.session.sharedLink()).toEqual({ total: 3, unmatched: 2, missingColumns: 0 });
      expect(shown()).toEqual(group('link'));
    });

    it('goes when the reader edits, and the link’s id leaves the URL', async () => {
      await open('/reports/3?view=abc', { views: { abc: encode('link') } });

      await edit('mine');

      expect(h.session.sharedLink()).toBeNull();
      expect(url()).not.toContain('view=');
    });

    it('"Save as mine" saves the link’s filters and takes the link out of the URL', async () => {
      await open('/reports/3?view=abc', { saved: encode('saved'), views: { abc: encode('link') } });

      h.session.saveLinkAsMine();
      await settleEdits();

      expect(writes().map((w) => w.method)).toEqual(['PUT']);
      expect(decodeViewFilterOverrides((writes()[0].body as { filters: string }).filters)).toEqual({
        w1: group('link'),
      });
      expect(h.session.sharedLink()).toBeNull();
      expect(url()).not.toContain('view=');
      expect(shown()).toEqual(group('link'));
    });

    it('"Back to mine" shows the saved filters again without saving anything', async () => {
      await open('/reports/3?view=abc', { saved: encode('saved'), views: { abc: encode('link') } });

      h.session.discardLink();
      await settleEdits();

      expect(shown()).toEqual(group('saved'));
      expect(h.session.sharedLink()).toBeNull();
      expect(url()).not.toContain('view=');
      expect(writes()).toEqual([]);
    });
  });
});

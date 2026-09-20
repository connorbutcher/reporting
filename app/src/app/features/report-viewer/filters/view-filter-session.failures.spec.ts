import { describe, expect, it } from 'vitest';
import { FilterGroup } from '../../../core/models/filter';
import { encodeViewFilterOverrides } from './view-filter-overrides';
import { encode, group, groupOn, useViewerHarness } from './testing/viewer-harness';

describe('ViewFilterSession: stale and failing filters', () => {
  const h = useViewerHarness();
  const { open, edit, settleEdits, shown, writes, url } = h;

  describe('a condition on a column that no longer exists', () => {
    /** What widgets actually query for the table: the server rejects a condition on an unknown column. */
    const queried = () => h.session.viewFilters()!.widgetFilters.get('w1')!();
    const encodeOn = (filter: FilterGroup) => encodeViewFilterOverrides({ w1: filter })!;

    it('is left out of what the widget queries, but stays in the panel', async () => {
      await open('/reports/3?view=abc', { views: { abc: encodeOn(groupOn('gone', 'x')) } });

      expect(queried()).toBeNull();
      expect(shown()).toEqual(groupOn('gone', 'x'));
    });

    it('leaves the rest of the filter applying', async () => {
      const both: FilterGroup = { ...group('kept'), children: [...group('kept').children, ...groupOn('gone', 'x').children] };
      await open('/reports/3?view=abc', { views: { abc: encodeOn(both) } });

      expect(queried()).toEqual(group('kept'));
    });

    it('is counted in the shared-link banner once the schema is in', async () => {
      await open('/reports/3?view=abc', { views: { abc: encodeOn(groupOn('gone', 'x')) } });

      expect(h.session.sharedLink()).toEqual({ total: 1, unmatched: 0, missingColumns: 1 });
      // The banner says so, so no separate toast on top of it.
      expect(h.notify.warn).not.toHaveBeenCalled();
    });

    it('is told to the reader once, when it is in their own saved filters', async () => {
      await open('/reports/3', { saved: encodeOn(groupOn('gone', 'x')) });
      await settleEdits();

      expect(queried()).toBeNull();
      expect(h.notify.warn).toHaveBeenCalledTimes(1);
      expect(h.notify.warn.mock.calls[0][0]).toContain('no longer exists');
    });
  });

  describe('when the reader’s saved filters fail to load', () => {
    it('opens on the published filters and says edits won’t be saved', async () => {
      await open('/reports/3', { failSaved: true });

      expect(shown()).toBeNull();
      expect(h.notify.warn).toHaveBeenCalledTimes(1);
      expect(h.notify.warn.mock.calls[0][0]).toContain("saved filters couldn't be loaded");
    });

    it('does not save an edit over filters the reader never saw', async () => {
      await open('/reports/3', { saved: encode('saved'), failSaved: true });

      await edit('mine');

      expect(writes()).toEqual([]);
      expect(shown()).toEqual(group('mine'));
    });

    it('does not "clear" them either when the reader resets to the published filters', async () => {
      await open('/reports/3', { saved: encode('saved'), failSaved: true });

      await edit('mine');
      await edit(null);

      expect(writes()).toEqual([]);
    });

    it('refuses "Save as mine", tells the reader, and keeps the link up', async () => {
      await open('/reports/3?view=abc', { failSaved: true, views: { abc: encode('link') } });

      h.session.saveLinkAsMine();
      await settleEdits();

      expect(writes()).toEqual([]);
      expect(h.notify.error).toHaveBeenCalledTimes(1);
      expect(h.session.sharedLink()).not.toBeNull();
      expect(url()).toContain('view=abc');
    });

    it('still applies a shared link’s filters', async () => {
      await open('/reports/3?view=abc', { failSaved: true, views: { abc: encode('link') } });

      expect(shown()).toEqual(group('link'));
      expect(h.session.sharedLink()).not.toBeNull();
    });
  });

  describe('when a shared link’s filters fail to load', () => {
    it('says it couldn’t be loaded — not that it wasn’t found — and keeps the link for a retry', async () => {
      await open('/reports/3?view=abc', { saved: encode('saved'), failViews: true });
      await settleEdits();

      expect(shown()).toEqual(group('saved'));
      expect(h.notify.warn).toHaveBeenCalledTimes(1);
      expect(h.notify.warn.mock.calls[0][0]).toContain("couldn't be loaded");
      expect(url()).toContain('view=abc');
      expect(h.session.sharedLink()).toBeNull();
      expect(writes()).toEqual([]);
    });

    it('still drops the link when it simply does not exist', async () => {
      await open('/reports/3?view=nope', { saved: encode('saved') });
      await settleEdits();

      expect(h.notify.warn.mock.calls[0][0]).toContain("couldn't be found");
      expect(url()).not.toContain('view=');
    });

    it('an edit afterwards saves and takes the failed link out of the URL', async () => {
      await open('/reports/3?view=abc', { saved: encode('saved'), failViews: true });

      await edit('mine');

      expect(writes().map((w) => w.method)).toEqual(['PUT']);
      expect(url()).not.toContain('view=');
    });
  });
});

import { describe, expect, it } from 'vitest';
import { FilterGroup } from '../../../core/models/filter';
import { ViewFilterOverrideCodec } from './view-filter-override-codec';
import { ViewerFixtures } from './testing/viewer-fixtures';
import { ViewerHarness } from './testing/viewer-harness';

describe('ViewFilterSession: stale and failing filters', () => {
  const h = ViewerHarness.use();

  describe('a condition on a column that no longer exists', () => {
    /** What widgets actually query for the table: the server rejects a condition on an unknown column. */
    const queried = () => h.session.viewFilters()!.widgetFilters.get('w1')!();
    const encodeOn = (filter: FilterGroup) => ViewFilterOverrideCodec.encode({ w1: filter })!;

    it('is left out of what the widget queries, but stays in the panel', async () => {
      await h.open('/reports/3?view=abc', {
        views: { abc: encodeOn(ViewerFixtures.groupOn('gone', 'x')) },
      });

      expect(queried()).toBeNull();
      expect(h.shown()).toEqual(ViewerFixtures.groupOn('gone', 'x'));
    });

    it('leaves the rest of the filter applying', async () => {
      const both: FilterGroup = {
        ...ViewerFixtures.group('kept'),
        children: [
          ...ViewerFixtures.group('kept').children,
          ...ViewerFixtures.groupOn('gone', 'x').children,
        ],
      };
      await h.open('/reports/3?view=abc', { views: { abc: encodeOn(both) } });

      expect(queried()).toEqual(ViewerFixtures.group('kept'));
    });

    it('is counted in the shared-link banner once the schema is in', async () => {
      await h.open('/reports/3?view=abc', {
        views: { abc: encodeOn(ViewerFixtures.groupOn('gone', 'x')) },
      });

      expect(h.session.sharedLink()).toEqual({ total: 1, unmatched: 0, missingColumns: 1 });
      // The banner says so, so no separate toast on top of it.
      expect(h.notify.warn).not.toHaveBeenCalled();
    });

    it('is told to the reader once, when it is in their own saved filters', async () => {
      await h.open('/reports/3', { saved: encodeOn(ViewerFixtures.groupOn('gone', 'x')) });
      await h.settleEdits();

      expect(queried()).toBeNull();
      expect(h.notify.warn).toHaveBeenCalledTimes(1);
      expect(h.notify.warn.mock.calls[0][0]).toContain('no longer exists');
    });
  });

  describe('when the reader’s saved filters fail to load', () => {
    it('opens on the published filters and says edits won’t be saved', async () => {
      await h.open('/reports/3', { failSaved: true });

      expect(h.shown()).toBeNull();
      expect(h.notify.warn).toHaveBeenCalledTimes(1);
      expect(h.notify.warn.mock.calls[0][0]).toContain("saved filters couldn't be loaded");
    });

    it('does not save an edit over filters the reader never saw', async () => {
      await h.open('/reports/3', { saved: ViewerFixtures.encode('saved'), failSaved: true });

      await h.edit('mine');

      expect(h.writes()).toEqual([]);
      expect(h.shown()).toEqual(ViewerFixtures.group('mine'));
    });

    it('does not "clear" them either when the reader resets to the published filters', async () => {
      await h.open('/reports/3', { saved: ViewerFixtures.encode('saved'), failSaved: true });

      await h.edit('mine');
      await h.edit(null);

      expect(h.writes()).toEqual([]);
    });

    it('refuses "Save as mine", tells the reader, and keeps the link up', async () => {
      await h.open('/reports/3?view=abc', {
        failSaved: true,
        views: { abc: ViewerFixtures.encode('link') },
      });

      h.session.saveLinkAsMine();
      await h.settleEdits();

      expect(h.writes()).toEqual([]);
      expect(h.notify.error).toHaveBeenCalledTimes(1);
      expect(h.session.sharedLink()).not.toBeNull();
      expect(h.url()).toContain('view=abc');
    });

    it('still applies a shared link’s filters', async () => {
      await h.open('/reports/3?view=abc', {
        failSaved: true,
        views: { abc: ViewerFixtures.encode('link') },
      });

      expect(h.shown()).toEqual(ViewerFixtures.group('link'));
      expect(h.session.sharedLink()).not.toBeNull();
    });
  });

  describe('when a shared link’s filters fail to load', () => {
    it('says it couldn’t be loaded — not that it wasn’t found — and keeps the link for a retry', async () => {
      await h.open('/reports/3?view=abc', {
        saved: ViewerFixtures.encode('saved'),
        failViews: true,
      });
      await h.settleEdits();

      expect(h.shown()).toEqual(ViewerFixtures.group('saved'));
      expect(h.notify.warn).toHaveBeenCalledTimes(1);
      expect(h.notify.warn.mock.calls[0][0]).toContain("couldn't be loaded");
      expect(h.url()).toContain('view=abc');
      expect(h.session.sharedLink()).toBeNull();
      expect(h.writes()).toEqual([]);
    });

    it('still drops the link when it simply does not exist', async () => {
      await h.open('/reports/3?view=nope', { saved: ViewerFixtures.encode('saved') });
      await h.settleEdits();

      expect(h.notify.warn.mock.calls[0][0]).toContain("couldn't be found");
      expect(h.url()).not.toContain('view=');
    });

    it('an edit afterwards saves and takes the failed link out of the URL', async () => {
      await h.open('/reports/3?view=abc', {
        saved: ViewerFixtures.encode('saved'),
        failViews: true,
      });

      await h.edit('mine');

      expect(h.writes().map((w) => w.method)).toEqual(['PUT']);
      expect(h.url()).not.toContain('view=');
    });
  });
});

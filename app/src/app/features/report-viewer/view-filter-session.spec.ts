import { Component, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterGroup } from '../../core/models/filter';
import { NotificationService } from '../../core/services/notification.service';
import { ReportViewerStore } from './report-viewer.store';
import { ViewFilterSession } from './view-filter-session';
import { decodeViewFilterOverrides, encodeViewFilterOverrides } from './view-filter-overrides';

@Component({ template: '', providers: [ReportViewerStore, ViewFilterSession] })
class HostComponent {
  public readonly store = inject(ReportViewerStore);
  public readonly session = inject(ViewFilterSession);
}

const group = (value: string): FilterGroup => ({
  kind: 'group',
  join: 'and',
  children: [{ kind: 'condition', columnId: 'job', operator: 'equals', values: [value] }],
});

/** What a saved or shared value looks like on the wire: the table widget `w1`'s filter set to `value`. */
const encode = (value: string): string => encodeViewFilterOverrides({ w1: group(value) })!;

const REPORT = { id: 3, name: 'R', latestVersionNumber: 1, accessLevel: 'viewer' };
const CONTENT = {
  reportId: 3,
  name: 'R',
  notes: null,
  filters: [],
  tabs: [
    {
      id: 't1',
      name: 'Tab',
      order: 0,
      columns: 12,
      rows: 12,
      widgets: [
        {
          id: 'w1',
          type: 'dataTable',
          config: { type: 'dataTable', datasetId: 7, title: 'Bearings', columns: [], filter: null },
        },
      ],
    },
  ],
};
const SCHEMA = {
  id: 7,
  name: 'Bearings',
  columns: [{ id: 'job', name: 'Job', type: 'string', order: 0, configuration: {} }],
};
const OPERATORS = [
  { type: 'string', operators: [{ value: 'equals', label: 'is', operandCount: 1, operandKind: 'text' }] },
];

interface Sent {
  method: string;
  url: string;
  body: unknown;
}

/** What the "server" holds: the reader's saved filters and any shared snapshots by short id. */
interface Server {
  saved: string | null;
  views: Record<string, string>;
}

/**
 * The viewer's filter rules, driven through the real store, session, router and HTTP layer: where the
 * filters start (link > saved > published), that only the reader's own edits are saved, that a link
 * carries only a short id, and what the banner is told.
 */
describe('ViewFilterSession', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let session: ViewFilterSession;
  let sent: Sent[];
  let server: Server;
  let notify: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Date is faked too: RxJS's debounceTime compares against Date.now() when its timer fires.
    vi.useFakeTimers();
    sent = [];
    server = { saved: null, views: {} };
    notify = { warn: vi.fn(), error: vi.fn(), success: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'reports/:reportId', component: HostComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { ...notify, apiError: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.useRealTimers());

  /** Answers every request the viewer makes, recording each so a test can see what was (not) sent. */
  async function settle(): Promise<void> {
    for (let round = 0; round < 8; round++) {
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(0);
      for (const req of http.match(() => true)) {
        const { method, url, body } = req.request;
        sent.push({ method, url, body });
        req.flush(answer(method, url, body) as object | null);
      }
    }
  }

  function answer(method: string, url: string, body: unknown): unknown {
    if (method === 'POST' && url.endsWith('/api/reports/3/shared-views')) {
      const filters = (body as { filters: string }).filters;
      server.views['newlink123'] = filters;
      return { id: 'newlink123', filters };
    }
    if (method !== 'GET') return null;

    const shared = /\/api\/reports\/3\/shared-views\/([^/]+)$/.exec(url);
    if (shared) return { id: shared[1], filters: server.views[shared[1]] ?? null };
    if (url.endsWith('/api/filters/operators')) return OPERATORS;
    if (url.endsWith('/api/reports/3')) return REPORT;
    if (url.endsWith('/api/reports/3/versions')) return [];
    if (url.endsWith('/api/reports/3/versions/1')) return CONTENT;
    if (url.endsWith('/api/reports/3/view-filters')) return { filters: server.saved };
    if (url.endsWith('/api/datasets/7/schema')) return SCHEMA;
    return null;
  }

  /** Opens the viewer at a URL and lets it load. */
  async function open(url: string, initial: Partial<Server> = {}): Promise<void> {
    Object.assign(server, initial);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await settle();
    sent.length = 0; // only what happens after loading matters
    session = harness.routeDebugElement!.injector.get(ViewFilterSession);
  }

  /** Lets effects run (which starts the 300ms debounce), waits it out, then answers whatever that sent. */
  async function settleEdits(): Promise<void> {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(400);
    await settle();
  }

  /** The reader edits the table's filter and the edit settles. */
  async function edit(value: string | null): Promise<void> {
    session.viewFilters()!.widgetEntries[0].group.replaceWith(value === null ? null : group(value));
    await settleEdits();
  }

  /** Runs "Copy link" to the end: it waits on the server for the short id, so the server has to answer meanwhile. */
  async function copyLink(): Promise<void> {
    const copying = session.copyLink();
    await settle();
    await copying;
  }

  const shown = (): FilterGroup | null => session.viewFilters()!.widgetEntries[0].group.toDto();
  const writes = () => sent.filter((s) => s.method !== 'GET');
  const url = () => TestBed.inject(Router).url;

  describe('where the filters start', () => {
    it('is the published filters when there is no link and nothing saved', async () => {
      await open('/reports/3');

      expect(shown()).toBeNull();
      expect(session.sharedLink()).toBeNull();
      expect(writes()).toEqual([]);
    });

    it('is the saved filters when opened without a link, without re-saving them', async () => {
      await open('/reports/3', { saved: encode('saved') });
      await settleEdits();

      expect(shown()).toEqual(group('saved'));
      expect(session.sharedLink()).toBeNull();
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
      expect(session.sharedLink()).toBeNull();
      expect(notify.warn).toHaveBeenCalledTimes(1);
      expect(url()).not.toContain('view=');
      expect(writes()).toEqual([]);
    });
  });

  describe('the shared-link banner', () => {
    it('is up while a link’s filters are showing, counting what it carried', async () => {
      await open('/reports/3?view=abc', { views: { abc: encode('link') } });

      expect(session.sharedLink()).toEqual({ total: 1, unmatched: 0 });
    });

    it('counts filters naming a widget this version does not have as unmatched', async () => {
      const view = encodeViewFilterOverrides({ w1: group('link'), ghost: group('x'), '404': null })!;
      await open('/reports/3?view=abc', { views: { abc: view } });

      expect(session.sharedLink()).toEqual({ total: 3, unmatched: 2 });
      expect(shown()).toEqual(group('link'));
    });

    it('goes when the reader edits, and the link’s id leaves the URL', async () => {
      await open('/reports/3?view=abc', { views: { abc: encode('link') } });

      await edit('mine');

      expect(session.sharedLink()).toBeNull();
      expect(url()).not.toContain('view=');
    });

    it('"Save as mine" saves the link’s filters and takes the link out of the URL', async () => {
      await open('/reports/3?view=abc', { saved: encode('saved'), views: { abc: encode('link') } });

      session.saveLinkAsMine();
      await settleEdits();

      expect(writes().map((w) => w.method)).toEqual(['PUT']);
      expect(decodeViewFilterOverrides((writes()[0].body as { filters: string }).filters)).toEqual({
        w1: group('link'),
      });
      expect(session.sharedLink()).toBeNull();
      expect(url()).not.toContain('view=');
      expect(shown()).toEqual(group('link'));
    });

    it('"Back to mine" shows the saved filters again without saving anything', async () => {
      await open('/reports/3?view=abc', { saved: encode('saved'), views: { abc: encode('link') } });

      session.discardLink();
      await settleEdits();

      expect(shown()).toEqual(group('saved'));
      expect(session.sharedLink()).toBeNull();
      expect(url()).not.toContain('view=');
      expect(writes()).toEqual([]);
    });
  });

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
      sent.length = 0;
      await edit('saved');

      expect(writes().map((w) => w.method)).toEqual(['PUT']);
    });

    it('applies filters from an outside change to the URL without saving them', async () => {
      await open('/reports/3?view=abc', { views: { abc: encode('first'), def: encode('second') } });
      server.views['def'] = encode('second');

      // Same route, new query param: the component is kept and the new link is applied.
      await harness.navigateByUrl('/reports/3?view=def');
      await settleEdits();

      expect(shown()).toEqual(group('second'));
      expect(session.sharedLink()).toEqual({ total: 1, unmatched: 0 });
      expect(writes()).toEqual([]);
    });
  });

  describe('a row still being typed', () => {
    const blank = (): FilterGroup => group('');

    it('is not saved, but is once it has its value', async () => {
      await open('/reports/3');

      session.viewFilters()!.widgetEntries[0].group.replaceWith(blank());
      await settleEdits();
      expect(writes()).toEqual([]);

      session.viewFilters()!.widgetEntries[0].group.children()[0].setValue(0, 'typed');
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
      expect(notify.success).toHaveBeenCalled();
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

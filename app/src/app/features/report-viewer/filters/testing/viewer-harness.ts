import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { FilterGroup } from '../../../../core/models/filter';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReportViewerStore } from '../../report-viewer.store';
import { SavedViewFilters } from '../saved-view-filters';
import { SharedViewLink } from '../shared-view-link';
import { encodeViewFilterOverrides } from '../view-filter-overrides';
import { ViewFilterSchemas } from '../view-filter-schemas';
import { ViewFilterSession } from '../view-filter-session';

@Component({
  template: '',
  providers: [ReportViewerStore, ViewFilterSchemas, SavedViewFilters, SharedViewLink, ViewFilterSession],
})
class HostComponent {
  public readonly session = inject(ViewFilterSession);
}

export const groupOn = (columnId: string, value: string): FilterGroup => ({
  kind: 'group',
  join: 'and',
  children: [{ kind: 'condition', columnId, operator: 'equals', values: [value] }],
});

/** A filter on the dataset's one column, `job`. */
export const group = (value: string): FilterGroup => groupOn('job', value);

/** The table widget `w1`'s filter set to `value`, as a saved or shared value looks on the wire. */
export const encode = (value: string): string => encodeViewFilterOverrides({ w1: group(value) })!;

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

/** What the fake server holds. */
export interface FakeServer {
  saved: string | null;
  /** The report publishes a page filter on dataset 7 whose condition is missing its value. */
  publishedBlankFilter?: boolean;
  /** Shared snapshots by short id. */
  views: Record<string, string>;
  /** Loading the reader's saved filters fails (a 500). */
  failSaved?: boolean;
  /** Loading any shared link fails (a 500), as opposed to the link not existing. */
  failViews?: boolean;
}

type Spy = ReturnType<typeof vi.fn>;

export interface ViewerHarness {
  readonly session: ViewFilterSession;
  readonly notify: { warn: Spy; error: Spy; success: Spy };
  /** Opens the viewer at a URL and lets it load. */
  open(url: string, server?: Partial<FakeServer>): Promise<void>;
  /** Navigates the open viewer; the same route keeps its component, so this is an outside URL change. */
  navigate(url: string): Promise<void>;
  /** The reader edits the table's filter (null clears it) and the edit settles. */
  edit(value: string | null): Promise<void>;
  /** Lets effects run, waits out the save debounce, and answers what that sent. */
  settleEdits(): Promise<void>;
  /** Runs "Copy link" to the end; it waits on the server for the short id, so the server must answer meanwhile. */
  copyLink(): Promise<void>;
  /** The table filter as the reader sees it. */
  shown(): FilterGroup | null;
  /** Non-GET requests sent since the viewer finished loading. */
  writes(): Sent[];
  url(): string;
}

/**
 * Drives the real store, session, router and HTTP layer against a fake server. Call inside a
 * `describe`; it registers its own setup and teardown.
 */
export function useViewerHarness(): ViewerHarness {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let session: ViewFilterSession;
  let sent: Sent[];
  let server: FakeServer;
  let notify: ViewerHarness['notify'];

  // Date is faked too: RxJS's debounceTime compares against Date.now() when its timer fires.
  beforeEach(() => {
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

  const answer = (method: string, url: string, body: unknown): unknown => {
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
    if (url.endsWith('/api/reports/3/versions/1')) {
      return server.publishedBlankFilter ? { ...CONTENT, filters: [{ datasetId: 7, filter: group('') }] } : CONTENT;
    }
    if (url.endsWith('/api/reports/3/view-filters')) return { filters: server.saved };
    if (url.endsWith('/api/datasets/7/schema')) return SCHEMA;
    return null;
  };

  const fails = (method: string, url: string): boolean =>
    method === 'GET' &&
    ((!!server.failSaved && url.endsWith('/view-filters')) ||
      (!!server.failViews && /\/shared-views\/[^/]+$/.test(url)));

  /** Answers every request the viewer makes, recording each so a test can see what was (not) sent. */
  const settle = async (): Promise<void> => {
    for (let round = 0; round < 8; round++) {
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(0);
      for (const req of http.match(() => true)) {
        const { method, url, body } = req.request;
        sent.push({ method, url, body });
        if (fails(method, url)) req.flush('boom', { status: 500, statusText: 'Server Error' });
        else req.flush(answer(method, url, body) as object | null);
      }
    }
  };

  const settleEdits = async (): Promise<void> => {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(400);
    await settle();
  };

  return {
    get session() {
      return session;
    },
    get notify() {
      return notify;
    },
    async open(url, initial = {}) {
      Object.assign(server, initial);
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      await settle();
      sent.length = 0;
      session = harness.routeDebugElement!.injector.get(ViewFilterSession);
    },
    async navigate(url) {
      await harness.navigateByUrl(url);
    },
    async edit(value) {
      session.viewFilters()!.widgetEntries[0].group.replaceWith(value === null ? null : group(value));
      await settleEdits();
    },
    settleEdits,
    async copyLink() {
      const copying = session.copyLink();
      await settle();
      await copying;
    },
    shown: () => session.viewFilters()!.widgetEntries[0].group.toDto(),
    writes: () => sent.filter((s) => s.method !== 'GET'),
    url: () => TestBed.inject(Router).url,
  };
}

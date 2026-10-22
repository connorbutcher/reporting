import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { FilterGroup } from '../../../../core/models/filter';
import { NotificationService } from '../../../../core/services/notification.service';
import { ViewFilterSession } from '../view-filter-session';
import { FakeServer } from './fake-server';
import { SentRequest } from './sent-request';
import { ViewerFixtures } from './viewer-fixtures';
import { ViewerHostComponent } from './viewer-host.component';

export class ViewerHarness {
  public readonly notify = { warn: vi.fn(), error: vi.fn(), success: vi.fn() };

  private sent: SentRequest[] = [];

  private server: FakeServer = { saved: null, views: {} };

  private http!: HttpTestingController;

  private harness!: RouterTestingHarness;

  private viewSession!: ViewFilterSession;

  /**
   * Call inside a `describe`; it registers its own setup and teardown. Date is faked too: RxJS's
   * debounceTime compares against Date.now() when its timer fires.
   */
  public static use(): ViewerHarness {
    const harness = new ViewerHarness();
    beforeEach(() => harness.reset());
    afterEach(() => vi.useRealTimers());
    return harness;
  }

  /** Opens the viewer at a URL and lets it load. */
  public async open(url: string, initial: Partial<FakeServer> = {}): Promise<void> {
    Object.assign(this.server, initial);
    this.harness = await RouterTestingHarness.create();
    await this.harness.navigateByUrl(url);
    await this.settle();
    this.sent.length = 0;
    this.viewSession = this.harness.routeDebugElement!.injector.get(ViewFilterSession);
  }

  /** Navigates the open viewer; the same route keeps its component, so this is an outside URL change. */
  public async navigate(url: string): Promise<void> {
    await this.harness.navigateByUrl(url);
  }

  /** The reader edits the table's filter (null clears it) and the edit settles. */
  public async edit(value: string | null): Promise<void> {
    this.session
      .viewFilters()!
      .widgetEntries[0].group.replaceWith(value === null ? null : ViewerFixtures.group(value));
    await this.settleEdits();
  }

  /** Lets effects run, waits out the save debounce, and answers what that sent. */
  public async settleEdits(): Promise<void> {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(400);
    await this.settle();
  }

  /** Runs "Copy link" to the end; it waits on the server for the short id, so the server must answer meanwhile. */
  public async copyLink(): Promise<void> {
    const copying = this.session.copyLink();
    await this.settle();
    await copying;
  }

  /** The table filter as the reader sees it. */
  public shown(): FilterGroup | null {
    return this.session.viewFilters()!.widgetEntries[0].group.toDto();
  }

  /** Non-GET requests sent since the viewer finished loading. */
  public writes(): SentRequest[] {
    return this.sent.filter((s) => s.method !== 'GET');
  }

  public url(): string {
    return TestBed.inject(Router).url;
  }

  public get session(): ViewFilterSession {
    return this.viewSession;
  }

  private reset(): void {
    vi.useFakeTimers();
    this.sent = [];
    this.server = { saved: null, views: {} };
    for (const spy of Object.values(this.notify)) {
      spy.mockReset();
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'reports/:reportId', component: ViewerHostComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { ...this.notify, apiError: vi.fn() } },
      ],
    });
    this.http = TestBed.inject(HttpTestingController);
  }

  /** Answers every request the viewer makes, recording each so a test can see what was (not) sent. */
  private async settle(): Promise<void> {
    for (let round = 0; round < 8; round++) {
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(0);
      for (const req of this.http.match(() => true)) {
        const { method, url, body } = req.request;
        this.sent.push({ method, url, body });
        if (this.fails(method, url)) {
          req.flush('boom', { status: 500, statusText: 'Server Error' });
        } else {
          req.flush(this.answer(method, url, body) as object | null);
        }
      }
    }
  }

  private fails(method: string, url: string): boolean {
    return (
      method === 'GET' &&
      ((!!this.server.failSaved && url.endsWith('/view-filters')) ||
        (!!this.server.failViews && /\/shared-views\/[^/]+$/.test(url)))
    );
  }

  private answer(method: string, url: string, body: unknown): unknown {
    if (method === 'POST' && url.endsWith('/api/reports/3/shared-views')) {
      const filters = (body as { filters: string }).filters;
      this.server.views['newlink123'] = filters;
      return { id: 'newlink123', filters };
    }
    if (method !== 'GET') {
      return null;
    }
    return this.answerGet(url);
  }

  private answerGet(url: string): unknown {
    const shared = /\/api\/reports\/3\/shared-views\/([^/]+)$/.exec(url);
    if (shared) {
      return { id: shared[1], filters: this.server.views[shared[1]] ?? null };
    }
    if (url.endsWith('/api/filters/operators')) {
      return ViewerFixtures.OPERATORS;
    }
    if (url.endsWith('/api/reports/3')) {
      return ViewerFixtures.REPORT;
    }
    if (url.endsWith('/api/reports/3/versions')) {
      return [];
    }
    if (url.endsWith('/api/reports/3/versions/1')) {
      return this.server.publishedBlankFilter
        ? {
            ...ViewerFixtures.CONTENT,
            filters: [{ datasetId: 7, filter: ViewerFixtures.group('') }],
          }
        : ViewerFixtures.CONTENT;
    }
    if (url.endsWith('/api/reports/3/view-filters')) {
      return { filters: this.server.saved };
    }
    if (url.endsWith('/api/datasets/7/schema')) {
      return ViewerFixtures.SCHEMA;
    }
    return null;
  }
}

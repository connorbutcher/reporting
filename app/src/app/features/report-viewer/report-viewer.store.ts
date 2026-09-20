import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { ReportApiService } from '../../core/api/report-api.service';
import {
  ReportRevisionContent,
  ReportSummary,
  ReportVersionSummary,
  widgetIdFromFragment,
} from '../../core/models/report';
import { NotificationService } from '../../core/services/notification.service';
import { UrlFragmentService } from '../../core/services/url-fragment.service';

/** Which secondary pane the aside is showing. */
export type AsideTab = 'filters' | 'history';

/**
 * The report viewer's state: which report, version and tab are showing, and navigating to another
 * version or the editor. Route params drive every fetch. Only published versions are shown; a draft
 * is edited in the builder. The reader's filters are `ViewFilterSession`'s, which builds on this.
 */
@Injectable()
export class ReportViewerStore {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportApi = inject(ReportApiService);
  private readonly notify = inject(NotificationService);
  private readonly fragments = inject(UrlFragmentService);

  readonly asideTab = signal<AsideTab>('filters');
  /** The filter entry the panel has expanded, driven from the grid as well as the panel. */
  readonly openFilterKey = signal<string | null>(null);

  /** The last report id whose view we recorded, so switching version doesn't re-record the same report. */
  private lastRecordedView: number | null = null;

  private readonly params = toSignal(this.route.paramMap);
  readonly reportId = computed(() => {
    const raw = this.params()?.get('reportId');
    return raw ? Number(raw) : null;
  });
  readonly viewingVersion = computed(() => {
    const v = this.params()?.get('versionNumber');
    return v ? Number(v) : null;
  });

  private readonly reportResource = httpResource<ReportSummary>(() =>
    this.reportId() ? `/api/reports/${this.reportId()}` : undefined,
  );
  private readonly versionsResource = httpResource<ReportVersionSummary[]>(
    () => (this.reportId() ? `/api/reports/${this.reportId()}/versions` : undefined),
    { defaultValue: [] },
  );
  // The viewer only ever shows published versions — the draft is edited in the builder.
  private readonly contentResource = httpResource<ReportRevisionContent>(() => {
    const id = this.reportId();
    // hasValue() guards the read: value() throws while the resource is loading or errored.
    const report = this.reportResource.hasValue() ? this.reportResource.value() : null;
    if (!id || !report) return undefined;
    const target = this.viewingVersion() ?? report.latestVersionNumber;
    return target != null ? `/api/reports/${id}/versions/${target}` : undefined;
  });

  readonly report = computed(() =>
    this.reportResource.hasValue() ? this.reportResource.value() : null,
  );
  readonly versions = this.versionsResource.value;
  readonly content = computed(() =>
    this.contentResource.hasValue() ? this.contentResource.value() : null,
  );

  // Which tab the grid shows is the `tab` query param, so the URL is the source of
  // truth: reloading, deep-linking and back/forward all restore the open tab. The
  // value is a tab's stable id (its RefId), which is preserved across versions.
  private readonly tabParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tab'))),
    { initialValue: this.route.snapshot.queryParamMap.get('tab') },
  );
  readonly tabs = computed(() =>
    [...(this.content()?.tabs ?? [])].sort((a, b) => a.order - b.order),
  );
  /** The param when it names a tab this version has; null falls back to the first by order. */
  readonly activeTabId = computed(() => {
    const raw = this.tabParam();
    return raw && this.tabs().some((t) => t.id === raw) ? raw : null;
  });
  readonly activeTab = computed(() => {
    const tabs = this.tabs();
    return tabs.find((t) => t.id === this.activeTabId()) ?? tabs[0] ?? null;
  });
  readonly loading = computed(
    () =>
      !this.reportId() ||
      this.reportResource.isLoading() ||
      this.versionsResource.isLoading() ||
      this.contentResource.isLoading(),
  );
  readonly notFound = computed(
    () => this.reportResource.error() != null || this.versionsResource.error() != null,
  );

  constructor() {
    effect(() => {
      const content = this.content();
      untracked(() => {
        if (content) this.recordView(content.reportId);
      });
    });

    // Keep the URL pointing at a real tab: when the `tab` param is missing or names
    // a tab this version doesn't have, default to the tab owning the widget a URL
    // fragment names — so a shared link to a widget lands on the right tab — or
    // the first one (replacing history so the bare URL isn't a back-button trap).
    // A param that resolves is left be — tab ids are stable across versions, so it
    // survives switching version too.
    effect(() => {
      const tabs = this.tabs();
      untracked(() => {
        if (!tabs.length || this.activeTabId() !== null) return;
        const targetWidgetId = widgetIdFromFragment(this.fragments.fragment());
        const targetTab = targetWidgetId
          ? tabs.find((t) => t.widgets.some((w) => w.id === targetWidgetId))
          : null;
        this.goToTab(targetTab?.id ?? tabs[0].id, true);
      });
    });
  }

  /**
   * Writes the active tab to the `tab` query param, which the URL drives back
   * into {@link activeTabId}. Preserves any fragment already on the URL — a
   * switch to the tab a fragment's widget lives on must not then erase it.
   */
  private goToTab(tabId: string, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl,
    });
  }

  /**
   * Records that the reader opened this report, for their "recently viewed" list. Guarded so
   * switching between versions of the same report doesn't re-record it. Fire-and-forget: a failure
   * to record a view should never disrupt viewing.
   */
  private recordView(reportId: number): void {
    if (reportId === this.lastRecordedView) return;
    this.lastRecordedView = reportId;
    this.reportApi.recordView(reportId).subscribe({ error: () => {} });
  }

  showTab(tab: AsideTab): void {
    this.asideTab.set(tab);
  }

  /** Switches which report tab the grid shows by navigating the `tab` query param. */
  selectTab(tabId: string): void {
    if (this.activeTabId() === tabId) return;
    this.goToTab(tabId);
  }

  /** Clicking a table's filter button takes the reader straight to its conditions. */
  filterWidget(widgetId: string): void {
    this.asideTab.set('filters');
    this.openFilterKey.set(widgetId);
  }

  /** Checks out a draft — from a specific version when restoring, otherwise from latest — then edits it. */
  edit(fromVersion?: number): void {
    const id = this.reportId();
    if (!id) return;
    this.reportApi.checkout(id, fromVersion).subscribe({
      next: () => this.router.navigate(['/reports', id, 'edit']),
      // A 403 (not an editor) is surfaced by the global interceptor; other failures show this.
      error: (err) => this.notify.apiError(err, "Couldn't open this report for editing. Please try again."),
    });
  }

  viewVersion(versionNumber: number): void {
    // Query params ride along: a link's filters and the tab apply to any version, by stable id.
    this.router.navigate(['/reports', this.reportId(), 'versions', versionNumber], {
      queryParamsHandling: 'preserve',
    });
  }

  viewLatest(): void {
    this.router.navigate(['/reports', this.reportId()], { queryParamsHandling: 'preserve' });
  }
}

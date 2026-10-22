import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { httpResource } from '@angular/common/http';
import { map } from 'rxjs';
import { ReportApiService } from '../../core/api/report-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { UrlFragmentService } from '../../core/services/url-fragment.service';
import { AsideTab } from './aside-tab';
import {
  ReportRevisionContent,
  ReportSummary,
  ReportVersionSummary,
  WidgetFragment,
} from '../../core/models/report';

@Injectable()
export class ReportViewerStore {
  public readonly asideTab = signal<AsideTab>('filters');

  public readonly openFilterKey = signal<string | null>(null);

  public readonly commentsWidgetId = signal<string | null>(null);

  public readonly reportId = computed(() => {
    const raw = this.params()?.get('reportId');
    return raw ? Number(raw) : null;
  });

  public readonly viewingVersion = computed(() => {
    const v = this.params()?.get('versionNumber');
    return v ? Number(v) : null;
  });

  public readonly report = computed(() =>
    this.reportResource.hasValue() ? this.reportResource.value() : null,
  );

  public readonly content = computed(() =>
    this.contentResource.hasValue() ? this.contentResource.value() : null,
  );

  public readonly tabs = computed(() =>
    [...(this.content()?.tabs ?? [])].sort((a, b) => a.order - b.order),
  );

  public readonly activeTabId = computed(() => {
    const raw = this.tabParam();
    return raw && this.tabs().some((t) => t.id === raw) ? raw : null;
  });

  public readonly activeTab = computed(() => {
    const tabs = this.tabs();
    return tabs.find((t) => t.id === this.activeTabId()) ?? tabs[0] ?? null;
  });

  public readonly loading = computed(
    () =>
      !this.reportId() ||
      this.reportResource.isLoading() ||
      this.versionsResource.isLoading() ||
      this.contentResource.isLoading(),
  );

  public readonly notFound = computed(
    () => this.reportResource.error() != null || this.versionsResource.error() != null,
  );

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly reportApi = inject(ReportApiService);

  private readonly notify = inject(NotificationService);

  private readonly fragments = inject(UrlFragmentService);

  private lastRecordedView: number | null = null;

  private readonly params = toSignal(this.route.paramMap);

  private readonly reportResource = httpResource<ReportSummary>(() =>
    this.reportId() ? `/api/reports/${this.reportId()}` : undefined,
  );

  private readonly versionsResource = httpResource<ReportVersionSummary[]>(
    () => (this.reportId() ? `/api/reports/${this.reportId()}/versions` : undefined),
    { defaultValue: [] },
  );

  private readonly contentResource = httpResource<ReportRevisionContent>(() => {
    const id = this.reportId();
    // value() throws while loading or errored.
    const report = this.reportResource.hasValue() ? this.reportResource.value() : null;
    if (!id || !report) {
      return undefined;
    }
    const target = this.viewingVersion() ?? report.latestVersionNumber;
    return target != null ? `/api/reports/${id}/versions/${target}` : undefined;
  });

  // The `tab` query param holds the tab's stable id, so links and back/forward restore it.
  private readonly tabParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tab'))),
    { initialValue: this.route.snapshot.queryParamMap.get('tab') },
  );

  constructor() {
    effect(() => {
      const content = this.content();
      untracked(() => {
        if (content) {
          this.recordView(content.reportId);
        }
      });
    });

    // A missing or unknown tab defaults to the tab holding the fragment's widget, else the first,
    // replacing history so the bare URL isn't a back trap.
    effect(() => {
      const tabs = this.tabs();
      untracked(() => {
        if (!tabs.length || this.activeTabId() !== null) {
          return;
        }
        const targetWidgetId = WidgetFragment.widgetId(this.fragments.fragment());
        const targetTab = targetWidgetId
          ? tabs.find((t) => t.widgets.some((w) => w.id === targetWidgetId))
          : null;
        this.goToTab(targetTab?.id ?? tabs[0].id, true);
      });
    });
  }

  public showTab(tab: AsideTab): void {
    this.asideTab.set(tab);
  }

  public selectTab(tabId: string): void {
    if (this.activeTabId() === tabId) {
      return;
    }
    this.goToTab(tabId);
  }

  public filterWidget(widgetId: string): void {
    this.asideTab.set('filters');
    this.openFilterKey.set(widgetId);
  }

  public openComments(widgetId: string): void {
    this.asideTab.set('comments');
    this.commentsWidgetId.set(widgetId);
  }

  /** Checks out a draft from `version` (or latest) and opens the editor. */
  public edit(fromVersion?: number): void {
    const id = this.reportId();
    if (!id) {
      return;
    }
    this.reportApi.checkout(id, fromVersion).subscribe({
      next: () => this.router.navigate(['/reports', id, 'edit']),
      // The interceptor toasts a 403.
      error: (err) =>
        this.notify.apiError(err, "Couldn't open this report for editing. Please try again."),
    });
  }

  public viewVersion(versionNumber: number): void {
    // Filters and tab apply to any version, so keep the query params.
    this.router.navigate(['/reports', this.reportId(), 'versions', versionNumber], {
      queryParamsHandling: 'preserve',
    });
  }

  public viewLatest(): void {
    this.router.navigate(['/reports', this.reportId()], { queryParamsHandling: 'preserve' });
  }

  public get versions() {
    return this.versionsResource.value;
  }

  /** Keeps any fragment, so jumping to a widget's tab doesn't erase it. */
  private goToTab(tabId: string, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl,
    });
  }

  /** Records the view for "recently viewed", once per report. Failures are ignored. */
  private recordView(reportId: number): void {
    if (reportId === this.lastRecordedView) {
      return;
    }
    this.lastRecordedView = reportId;
    this.reportApi.recordView(reportId).subscribe({ error: () => {} });
  }
}

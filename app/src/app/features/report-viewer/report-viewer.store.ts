import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import { FilterApiService } from '../../core/api/filter-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { DatasetSchema } from '../../core/models/dataset';
import { OperatorCatalogue } from '../../core/models/filter';
import {
  ReportRevisionContent,
  ReportSummary,
  ReportVersionSummary,
  readChartBindings,
} from '../../core/models/report';
import { isChartWidget } from '../../core/models/widget-catalog';
import { NotificationService } from '../../core/services/notification.service';
import { ReportViewFilters } from './report-view-filters';

/** Which secondary pane the aside is showing. */
export type AsideTab = 'filters' | 'history';

/**
 * Session state for the report viewer screen: which report and version are
 * loaded, the session filters layered over the published ones, which aside
 * pane is showing, and navigating into the editor or another version.
 *
 * Route params drive every fetch — changing report or version refetches
 * automatically. The viewer only ever shows published versions; the draft is
 * edited in the builder, and checking out (or restoring an old version into a
 * fresh draft) is the only way there.
 */
@Injectable()
export class ReportViewerStore {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportApi = inject(ReportApiService);
  private readonly datasetApi = inject(DatasetApiService);
  private readonly filterApi = inject(FilterApiService);
  private readonly notify = inject(NotificationService);

  /** Schemas and operators the filter panel needs to describe each column. */
  private readonly schemas = signal<Record<string, DatasetSchema>>({});
  private readonly catalogue = signal<OperatorCatalogue | null>(null);

  /** Session-only filters layered over the published ones; rebuilt per version. */
  readonly viewFilters = signal<ReportViewFilters | null>(null);
  readonly asideTab = signal<AsideTab>('filters');
  /** The filter entry the panel has expanded, driven from the grid as well as the panel. */
  readonly openFilterKey = signal<string | null>(null);

  private readonly params = toSignal(this.route.paramMap);
  private readonly reportId = computed(() => {
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

  /** Which tab the grid shows; null falls back to the first by order. */
  readonly activeTabId = signal<string | null>(null);
  readonly tabs = computed(() =>
    [...(this.content()?.tabs ?? [])].sort((a, b) => a.order - b.order),
  );
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
    this.filterApi
      .operators()
      .pipe(takeUntilDestroyed())
      .subscribe((catalogue) => this.catalogue.set(catalogue));

    // A new published version to show means fresh session filters (dropping any the reader had
    // applied) and a fresh set of schemas to name its columns.
    effect(() => {
      const content = this.contentResource.hasValue() ? this.contentResource.value() : null;
      untracked(() => {
        this.viewFilters.set(
          content
            ? new ReportViewFilters(content, this.schemas.asReadonly(), this.catalogue.asReadonly())
            : null,
        );
        this.openFilterKey.set(null);
        // A fresh version resets to its first tab.
        this.activeTabId.set(null);
        if (content) this.loadSchemas(content);
      });
    });
  }

  /** Fetches a schema per dataset the version uses, so the filter panel can name columns. */
  private loadSchemas(content: ReportRevisionContent): void {
    const datasetIds = new Set<number>();
    for (const widget of content.tabs.flatMap((t) => t.widgets)) {
      if (widget.type === 'dataTable') {
        if (widget.config.datasetId) datasetIds.add(widget.config.datasetId);
      } else if (isChartWidget(widget)) {
        // A chart can overlay several datasets — one per binding — all needed here.
        for (const binding of readChartBindings(widget.config)) {
          if (binding.datasetId) datasetIds.add(binding.datasetId);
        }
      }
    }

    for (const datasetId of datasetIds) {
      if (this.schemas()[datasetId]) continue;
      this.datasetApi.getSchema(datasetId).subscribe((schema) => {
        this.schemas.update((all) => ({ ...all, [datasetId]: schema }));
      });
    }
  }

  showTab(tab: AsideTab): void {
    this.asideTab.set(tab);
  }

  /** Switches which report tab the grid shows. */
  selectTab(tabId: string): void {
    this.activeTabId.set(tabId);
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
      error: () => this.notify.error("Couldn't open this report for editing. Please try again."),
    });
  }

  viewVersion(versionNumber: number): void {
    this.router.navigate(['/reports', this.reportId(), 'versions', versionNumber]);
  }

  viewLatest(): void {
    this.router.navigate(['/reports', this.reportId()]);
  }
}

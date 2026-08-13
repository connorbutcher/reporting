import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import { FilterApiService } from '../../core/api/filter-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { DatasetSchema } from '../../core/models/dataset.model';
import { OperatorCatalogue } from '../../core/models/filter.model';
import {
  ReportRevisionContent,
  ReportSummary,
  ReportVersionSummary,
  Widget,
} from '../../core/models/report.model';
import { isChartWidget } from '../../core/models/widget-catalog';
import { ReadonlyReportGridComponent } from './readonly-report-grid/readonly-report-grid.component';
import { ReportViewFilters } from './report-view-filters';
import { ViewFiltersPanelComponent } from './view-filters-panel/view-filters-panel.component';

/** Which secondary pane the aside is showing. */
type AsideTab = 'filters' | 'history';

/**
 * Read-only view of a report: the latest published version by default, or one
 * historical version when a version number is in the route. Checking out (or
 * restoring an old version into a fresh draft) is the only way into editing —
 * the draft/publish workflow is explicit by design.
 */
@Component({
  selector: 'app-report-viewer',
  imports: [DatePipe, ButtonModule, ReadonlyReportGridComponent, ViewFiltersPanelComponent],
  templateUrl: './report-viewer.component.html',
  styleUrl: './report-viewer.component.scss',
})
export class ReportViewerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportApi = inject(ReportApiService);
  private readonly datasetApi = inject(DatasetApiService);
  private readonly filterApi = inject(FilterApiService);

  /** Schemas and operators the filter panel needs to describe each column. */
  private readonly schemas = signal<Record<string, DatasetSchema>>({});
  private readonly catalogue = signal<OperatorCatalogue | null>(null);

  /** Session-only filters layered over the published ones; rebuilt per version. */
  protected readonly viewFilters = signal<ReportViewFilters | null>(null);
  protected readonly asideTab = signal<AsideTab>('filters');
  /** The filter entry the panel has expanded, driven from the grid as well as the panel. */
  protected readonly openFilterKey = signal<string | null>(null);

  // Route params drive every fetch: changing report or version refetches automatically.
  private readonly params = toSignal(this.route.paramMap);
  private readonly reportId = computed(() => this.params()?.get('reportId') ?? null);
  protected readonly viewingVersion = computed(() => {
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

  protected readonly report = computed(() =>
    this.reportResource.hasValue() ? this.reportResource.value() : null,
  );
  protected readonly versions = this.versionsResource.value;
  protected readonly content = computed(() =>
    this.contentResource.hasValue() ? this.contentResource.value() : null,
  );
  protected readonly loading = computed(
    () =>
      !this.reportId() ||
      this.reportResource.isLoading() ||
      this.versionsResource.isLoading() ||
      this.contentResource.isLoading(),
  );
  protected readonly notFound = computed(
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
        if (content) this.loadSchemas(content);
      });
    });
  }

  /** Fetches a schema per dataset the version uses, so the filter panel can name columns. */
  private loadSchemas(content: ReportRevisionContent): void {
    const datasetIds = new Set(
      content.widgets
        .filter(
          (w): w is Extract<Widget, { type: 'dataTable' | 'scatterChart' | 'lineChart' }> =>
            (w.type === 'dataTable' || isChartWidget(w)) && !!w.config.datasetId,
        )
        .map((w) => w.config.datasetId!),
    );

    for (const datasetId of datasetIds) {
      if (this.schemas()[datasetId]) continue;
      this.datasetApi.getSchema(datasetId).subscribe((schema) => {
        this.schemas.update((all) => ({ ...all, [datasetId]: schema }));
      });
    }
  }

  protected showTab(tab: AsideTab): void {
    this.asideTab.set(tab);
  }

  /** Clicking a table's filter button takes the reader straight to its conditions. */
  protected filterWidget(widgetId: string): void {
    this.asideTab.set('filters');
    this.openFilterKey.set(widgetId);
  }

  /** Checks out a draft — from a specific version when restoring, otherwise from latest — then edits it. */
  protected edit(fromVersion?: number): void {
    const id = this.reportId();
    if (!id) return;
    this.reportApi.checkout(id, fromVersion).subscribe(() => {
      this.router.navigate(['/reports', id, 'edit']);
    });
  }

  protected viewVersion(versionNumber: number): void {
    this.router.navigate(['/reports', this.reportId(), 'versions', versionNumber]);
  }

  protected viewLatest(): void {
    this.router.navigate(['/reports', this.reportId()]);
  }

  /** Plain-text summary for the compact version-history list, stripped of the notes' HTML. */
  protected previewText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? '').trim();
  }
}

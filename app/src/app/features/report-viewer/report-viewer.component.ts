import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { forkJoin } from 'rxjs';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import { FilterApiService } from '../../core/api/filter-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { DatasetSchema } from '../../core/models/dataset.model';
import { OperatorCatalogue } from '../../core/models/filter.model';
import { ReportRevisionContent, ReportSummary, ReportVersionSummary } from '../../core/models/report.model';
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
export class ReportViewerComponent implements OnInit {
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

  protected readonly report = signal<ReportSummary | null>(null);
  protected readonly versions = signal<ReportVersionSummary[]>([]);
  protected readonly content = signal<ReportRevisionContent | null>(null);
  protected readonly viewingVersion = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  private reportId = '';

  ngOnInit(): void {
    this.filterApi.operators().subscribe((catalogue) => this.catalogue.set(catalogue));

    this.route.paramMap.subscribe((params) => {
      const reportId = params.get('reportId');
      if (!reportId) return;

      this.reportId = reportId;
      const versionParam = params.get('versionNumber');
      this.viewingVersion.set(versionParam ? Number(versionParam) : null);
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.notFound.set(false);

    forkJoin({
      report: this.reportApi.get(this.reportId),
      versions: this.reportApi.getVersions(this.reportId),
    }).subscribe({
      next: ({ report, versions }) => {
        this.report.set(report);
        this.versions.set(versions);

        const target = this.viewingVersion() ?? report.latestVersionNumber;
        if (target === null) {
          this.content.set(null);
          this.viewFilters.set(null);
          this.loading.set(false);
          return;
        }

        this.reportApi.getVersion(this.reportId, target).subscribe((content) => {
          this.content.set(content);
          // Session filters start from what this version publishes, so switching
          // versions drops any narrowing the reader had applied to the last one.
          this.viewFilters.set(new ReportViewFilters(content, this.schemas.asReadonly(), this.catalogue.asReadonly()));
          this.openFilterKey.set(null);
          this.loadSchemas(content);
          this.loading.set(false);
        });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Fetches a schema per dataset the version uses, so the filter panel can name columns. */
  private loadSchemas(content: ReportRevisionContent): void {
    const datasetIds = new Set(
      content.widgets
        .filter((w) => (w.type === 'dataTable' || w.type === 'chart') && w.config.datasetId)
        .map((w) => (w as Extract<typeof w, { type: 'dataTable' | 'chart' }>).config.datasetId!),
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
    this.reportApi.checkout(this.reportId, fromVersion).subscribe(() => {
      this.router.navigate(['/reports', this.reportId, 'edit']);
    });
  }

  protected viewVersion(versionNumber: number): void {
    this.router.navigate(['/reports', this.reportId, 'versions', versionNumber]);
  }

  protected viewLatest(): void {
    this.router.navigate(['/reports', this.reportId]);
  }

  /** Plain-text summary for the compact version-history list, stripped of the notes' HTML. */
  protected previewText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? '').trim();
  }
}

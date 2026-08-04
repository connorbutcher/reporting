import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { forkJoin } from 'rxjs';
import { ReportApiService } from '../../core/api/report-api.service';
import { ReportRevisionContent, ReportSummary, ReportVersionSummary } from '../../core/models/report.model';
import { ReadonlyReportGridComponent } from './readonly-report-grid/readonly-report-grid.component';

/**
 * Read-only view of a report: the latest published version by default, or one
 * historical version when a version number is in the route. Checking out (or
 * restoring an old version into a fresh draft) is the only way into editing —
 * the draft/publish workflow is explicit by design.
 */
@Component({
  selector: 'app-report-viewer',
  imports: [DatePipe, ButtonModule, ReadonlyReportGridComponent],
  templateUrl: './report-viewer.component.html',
  styleUrl: './report-viewer.component.scss',
})
export class ReportViewerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportApi = inject(ReportApiService);

  protected readonly report = signal<ReportSummary | null>(null);
  protected readonly versions = signal<ReportVersionSummary[]>([]);
  protected readonly content = signal<ReportRevisionContent | null>(null);
  protected readonly viewingVersion = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  private reportId = '';

  /** The change notes for whichever version is currently on screen, latest or historical. */
  protected readonly currentVersionNotes = computed(() => {
    const target = this.viewingVersion() ?? this.report()?.latestVersionNumber ?? null;
    if (target === null) return null;
    return this.versions().find((v) => v.versionNumber === target)?.notes ?? null;
  });

  ngOnInit(): void {
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
          this.loading.set(false);
          return;
        }

        this.reportApi.getVersion(this.reportId, target).subscribe((content) => {
          this.content.set(content);
          this.loading.set(false);
        });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
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

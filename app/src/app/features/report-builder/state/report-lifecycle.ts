import { WritableSignal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { FilterApiService } from '../../../core/api/filter-api.service';
import { ReportApiService } from '../../../core/api/report-api.service';
import { DatasetSummary } from '../../../core/models/dataset';
import { OperatorCatalogue } from '../../../core/models/filter';
import { ReportRevisionContent } from '../../../core/models/report';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportModel } from '../models/report.model';
import { ModelSources } from '../models/widget.model';
import { ReportAutosave } from './report-autosave';

/**
 * Loading and publishing the report: fetching the draft (checking one out if the
 * viewer didn't), building the model tree, and pushing a published version back.
 * Owns the "what was loaded" baseline that {@link hasUnpublishedChanges} compares
 * against — which the model's own dirty flag can't answer, since autosave clears
 * that the moment it catches up.
 */
export class ReportLifecycle {
  /**
   * The normalised snapshot the draft had when it was loaded (or last
   * published), for detecting whether there's anything new to publish.
   */
  private loadBaseline: string | null = null;

  /** Whether this draft differs from what was loaded (or last published). */
  readonly hasUnpublishedChanges = computed(() => {
    const model = this.model();
    if (!model || this.loadBaseline === null) return false;
    return JSON.stringify(model.toDto()) !== this.loadBaseline;
  });

  constructor(
    private readonly reportApi: ReportApiService,
    private readonly datasetApi: DatasetApiService,
    private readonly filterApi: FilterApiService,
    private readonly router: Router,
    private readonly model: WritableSignal<ReportModel | null>,
    private readonly operatorCatalogue: WritableSignal<OperatorCatalogue | null>,
    private readonly datasets: WritableSignal<DatasetSummary[]>,
    private readonly loading: WritableSignal<boolean>,
    private readonly sources: ModelSources,
    private readonly autosave: ReportAutosave,
    private readonly notify: NotificationService,
  ) {}

  /**
   * Loads the draft checked out for the given report. The report viewer is
   * responsible for checking a draft out before routing here; if none exists
   * (e.g. a direct navigation or a page refresh mid-edit) one is checked out
   * on the fly so the canvas still has something to edit.
   */
  load(reportId: number): void {
    this.loading.set(true);
    this.datasetApi.listForReport(reportId).subscribe((datasets) => this.datasets.set(datasets));
    this.filterApi.operators().subscribe((catalogue) => this.operatorCatalogue.set(catalogue));

    this.reportApi.getDraft(reportId).subscribe({
      next: (content) => this.setLoadedReport(content),
      // No draft yet — check one out on the fly. If that fails too there's
      // nothing to edit, so stop the skeleton and say so rather than hanging on
      // it forever.
      error: () =>
        this.reportApi.checkout(reportId).subscribe({
          next: (content) => this.setLoadedReport(content),
          error: () => {
            this.loading.set(false);
            this.notify.error("This report couldn't be opened for editing. Please try again.");
          },
        }),
    });
  }

  /** Publishes the checked-out draft as a new version, then returns to the viewer. */
  publish(notes: string | null): void {
    const model = this.model();
    if (!model) return;

    this.reportApi.publish(model.reportId, notes).subscribe({
      next: () => {
        this.loadBaseline = JSON.stringify(model.toDto());
        this.router.navigate(['/reports', model.reportId]);
        this.notify.success('Report published.');
      },
      error: () => this.notify.error("The report couldn't be published. Please try again."),
    });
  }

  private setLoadedReport(report: ReportRevisionContent): void {
    const model = ReportModel.fromDto(report, this.sources);
    this.model.set(model);
    this.loadBaseline = JSON.stringify(model.toDto());
    // Seeded from the model, not the server payload: the model normalises
    // defaults and key order, so anything else would look like a change and
    // leave an undo step available before the user has done anything.
    this.autosave.reset(model.toDto());
    this.loading.set(false);
  }
}

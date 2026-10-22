import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ReportApiService } from '../../../core/api/report-api.service';
import { HttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import { ReportRevisionContent } from '../../../core/models/report';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportModel } from '../models/report.model';
import { ReportAutosave } from './report-autosave';
import { ReportSession } from './report-session';

/**
 * Loads and publishes the report. The draft resource is keyed on the route's report id; if no draft
 * is checked out yet (a 404), one is checked out and the resource reloads. The content becomes the
 * {@link ReportModel} tree once, seeding the autosave baseline.
 */
@Injectable()
export class ReportLifecycle {
  public readonly loading = computed(
    () => this.session.reportId() !== null && this.session.model() === null && !this.loadFailed(),
  );

  /** An edit hasn't reached the server or the last save failed; shared by beforeunload and the route guard. */
  public readonly hasUnsavedRisk = computed(
    () => this.session.dirty() || this.autosave.saveFailed(),
  );

  private readonly reportApi = inject(ReportApiService);
  private readonly router = inject(Router);
  private readonly session = inject(ReportSession);
  private readonly autosave = inject(ReportAutosave);
  private readonly notify = inject(NotificationService);

  /** A missing draft is expected (checked out below), so the global not-found toast is skipped. */
  private readonly draftResource = httpResource<ReportRevisionContent>(() => {
    const id = this.session.reportId();
    return id !== null
      ? { url: `/api/reports/${id}/draft`, context: HttpErrorNotification.skip() }
      : undefined;
  });

  /** So a checkout is attempted only once per report. */
  private checkoutAttemptedFor: number | null = null;

  /** So opening the editor records one "recently viewed" visit. */
  private recordedViewFor: number | null = null;

  /** Set when even a checkout failed, so the skeleton stops. */
  private readonly loadFailed = signal(false);

  constructor() {
    // No draft yet: check one out and reload. If that fails too, give up so the skeleton stops.
    effect(() => {
      const id = this.session.reportId();
      const failed = this.draftResource.error() !== undefined;
      if (id === null || !failed) {
        return;
      }

      untracked(() => {
        if (this.checkoutAttemptedFor === id) {
          this.loadFailed.set(true);
          this.notify.error("This report couldn't be opened for editing. Please try again.");
          return;
        }
        this.checkoutAttemptedFor = id;
        this.reportApi.checkout(id).subscribe({
          next: () => this.draftResource.reload(),
          error: (err) => {
            this.loadFailed.set(true);
            // The global interceptor already reports a 403.
            this.notify.apiError(
              err,
              "This report couldn't be opened for editing. Please try again.",
            );
          },
        });
      });
    });

    effect(() => {
      const content = this.draftResource.hasValue() ? this.draftResource.value() : null;
      untracked(() => {
        if (content) {
          this.setLoadedReport(content);
        }
      });
    });
  }

  /** Publishes the draft as a new version, then returns to the viewer. */
  public publish(notes: string | null): void {
    const model = this.session.model();
    if (!model) {
      return;
    }

    this.reportApi.publish(model.reportId, notes).subscribe({
      next: () => {
        this.router.navigate(['/reports', model.reportId]);
        this.notify.success('Report published.');
      },
      error: (err) =>
        this.notify.apiError(err, "The report couldn't be published. Please try again."),
    });
  }

  private setLoadedReport(report: ReportRevisionContent): void {
    const model = ReportModel.fromDto(report, this.session.sources);
    this.session.model.set(model);
    // Seeded from the model, which normalises defaults and key order, so a fresh load has nothing to undo.
    this.autosave.reset(model.serialized());

    // Fire-and-forget: a failed record must never disrupt editing.
    if (report.reportId !== this.recordedViewFor) {
      this.recordedViewFor = report.reportId;
      this.reportApi.recordView(report.reportId).subscribe({ error: () => {} });
    }
  }
}

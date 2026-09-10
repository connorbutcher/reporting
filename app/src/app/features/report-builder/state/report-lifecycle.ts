import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ReportApiService } from '../../../core/api/report-api.service';
import { skipHttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import { ReportRevisionContent } from '../../../core/models/report';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportModel } from '../models/report.model';
import { ReportAutosave } from './report-autosave';
import { ReportSession } from './report-session';

/**
 * Loading and publishing the report. The draft is fetched with an
 * {@link httpResource} keyed on the route's report id (via {@link ReportSession}),
 * so navigating or reloading refetches on its own — no imperative `load()` call
 * from the screen. When the report has no checked-out draft yet (a direct
 * navigation or a refresh mid-edit), the GET 404s and this checks one out on the
 * fly, then reloads the resource. The resolved content is turned into the
 * {@link ReportModel} tree once, seeding the autosave baseline.
 */
@Injectable()
export class ReportLifecycle {
  private readonly reportApi = inject(ReportApiService);
  private readonly router = inject(Router);
  private readonly session = inject(ReportSession);
  private readonly autosave = inject(ReportAutosave);
  private readonly notify = inject(NotificationService);

  /**
   * The checked-out draft for the current report; refetched whenever the route id changes. A missing
   * draft is expected — the GET 404s and we check one out below — so this opts out of the global
   * not-found toast; the checkout fallback owns any real failure message.
   */
  private readonly draftResource = httpResource<ReportRevisionContent>(() => {
    const id = this.session.reportId();
    return id !== null
      ? { url: `/api/reports/${id}/draft`, context: skipHttpErrorNotification() }
      : undefined;
  });

  /** The report id we've already tried to check out a draft for, so we only try once. */
  private checkoutAttemptedFor: number | null = null;
  /** The report id whose view we've recorded, so opening the editor logs it once for "recently viewed". */
  private recordedViewFor: number | null = null;
  /** Set when even a checkout couldn't produce a draft, so the skeleton stops. */
  private readonly loadFailed = signal(false);

  /** True until the report's model tree is built (or loading has failed), for the canvas skeleton. */
  readonly loading = computed(
    () => this.session.reportId() !== null && this.session.model() === null && !this.loadFailed(),
  );

  /**
   * Whether leaving right now could lose work: an edit hasn't reached the server
   * yet, or the last attempt to send it failed. Shared by the beforeunload
   * handler and the route guard so both agree on the risk.
   */
  readonly hasUnsavedRisk = computed(() => this.session.dirty() || this.autosave.saveFailed());

  constructor() {
    // The GET failing means the report has no draft checked out yet — check one
    // out on the fly and reload the resource. If that fails too there's nothing
    // to edit, so give up and let the skeleton stop.
    effect(() => {
      const id = this.session.reportId();
      const failed = this.draftResource.error() !== undefined;
      if (id === null || !failed) return;

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
            // A 403 (not an editor) is surfaced by the global interceptor; other failures show this.
            this.notify.apiError(err, "This report couldn't be opened for editing. Please try again.");
          },
        });
      });
    });

    // Build the model tree once the draft content arrives (first load or after a checkout).
    effect(() => {
      const content = this.draftResource.hasValue() ? this.draftResource.value() : null;
      untracked(() => {
        if (content) this.setLoadedReport(content);
      });
    });
  }

  /** Publishes the checked-out draft as a new version, then returns to the viewer. */
  publish(notes: string | null): void {
    const model = this.session.model();
    if (!model) return;

    this.reportApi.publish(model.reportId, notes).subscribe({
      next: () => {
        this.router.navigate(['/reports', model.reportId]);
        this.notify.success('Report published.');
      },
      error: (err) => this.notify.apiError(err, "The report couldn't be published. Please try again."),
    });
  }

  private setLoadedReport(report: ReportRevisionContent): void {
    const model = ReportModel.fromDto(report, this.session.sources);
    this.session.model.set(model);
    // Seeded from the model, not the server payload: the model normalises
    // defaults and key order, so anything else would look like a change and
    // leave an undo step available before the user has done anything.
    this.autosave.reset(model.serialized());

    // Opening a report to edit counts as visiting it — record it once so it surfaces in the
    // editor's "recently viewed". Fire-and-forget: a failed record must never disrupt editing.
    if (report.reportId !== this.recordedViewFor) {
      this.recordedViewFor = report.reportId;
      this.reportApi.recordView(report.reportId).subscribe({ error: () => {} });
    }
  }
}

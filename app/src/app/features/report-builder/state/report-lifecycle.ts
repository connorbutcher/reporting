import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ReportApiService } from '../../../core/api/report-api.service';
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

  /** The checked-out draft for the current report; refetched whenever the route id changes. */
  private readonly draftResource = httpResource<ReportRevisionContent>(() => {
    const id = this.session.reportId();
    return id !== null ? `/api/reports/${id}/draft` : undefined;
  });

  /** The report id we've already tried to check out a draft for, so we only try once. */
  private checkoutAttemptedFor: number | null = null;
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
          error: () => {
            this.loadFailed.set(true);
            this.notify.error("This report couldn't be opened for editing. Please try again.");
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
      error: () => this.notify.error("The report couldn't be published. Please try again."),
    });
  }

  private setLoadedReport(report: ReportRevisionContent): void {
    const model = ReportModel.fromDto(report, this.session.sources);
    this.session.model.set(model);
    // Seeded from the model, not the server payload: the model normalises
    // defaults and key order, so anything else would look like a change and
    // leave an undo step available before the user has done anything.
    this.autosave.reset(model.serialized());
  }
}

import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject } from '@angular/core';
import { PublishDialogComponent } from '../../publish-dialog/publish-dialog.component';
import { ReportAutosave } from '../../state/report-autosave';
import { ReportLifecycle } from '../../state/report-lifecycle';
import { ReportSession } from '../../state/report-session';

/**
 * Publishes the draft as a new version. Allowed once the draft is loaded, fully saved and free of
 * errors and warnings. Warnings never block autosave, since a new blank widget must stay saveable,
 * but a published report shouldn't contain one.
 */
@Component({
  selector: 'app-publish-button',
  template: `
    <button
      type="button"
      class="publish"
      [disabled]="!canPublish()"
      [title]="title()"
      (click)="publish()"
    >
      <i class="pi pi-cloud-upload" aria-hidden="true"></i>
      Publish
    </button>
  `,
  styles: [
    `
      .publish {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 14px;
        border: 1px solid var(--app-navy);
        border-radius: 8px;
        background: var(--app-navy);
        color: #fff;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
      }
      .publish:hover:not(:disabled) {
        filter: brightness(1.1);
      }
      .publish:disabled {
        background: #fff;
        color: #94a3b8;
        border-color: var(--app-card-border);
        cursor: default;
      }
    `,
  ],
})
export class PublishButtonComponent {
  public readonly canPublish = computed(
    () => this.draftLoaded() && this.noIssues() && this.allSaved(),
  );

  public readonly title = computed(() => {
    if (!this.draftLoaded()) return 'Loading the draft…';
    if (!this.session.isValid()) return 'Fix errors before publishing';
    if (!this.noIssues()) return 'Finish every widget before publishing — see the issues panel';
    if (this.autosave.saveFailed())
      return "Your last change hasn't saved yet — publishing is blocked until it does";
    if (!this.allSaved()) return 'Waiting for your changes to finish saving…';
    return 'Publish this draft as a new version';
  });

  private readonly session = inject(ReportSession);
  private readonly autosave = inject(ReportAutosave);
  private readonly lifecycle = inject(ReportLifecycle);
  private readonly dialog = inject(Dialog);
  private readonly draftLoaded = computed(() => this.session.model() !== null);

  /** Every edit has reached the server, so a publish snapshots the latest. */
  private readonly allSaved = computed(
    () => !this.session.dirty() && !this.autosave.saving() && !this.autosave.saveFailed(),
  );

  private readonly noIssues = computed(
    () => this.session.isValid() && this.session.warnings().length === 0,
  );

  public publish(): void {
    const ref = this.dialog.open<string | null>(PublishDialogComponent);
    ref.closed.subscribe((notes) => {
      // Undefined means the dialog was cancelled.
      if (notes === undefined) return;
      this.lifecycle.publish(notes);
    });
  }
}

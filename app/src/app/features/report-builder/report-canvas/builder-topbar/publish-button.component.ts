import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject } from '@angular/core';
import { PublishDialogComponent } from '../../publish-dialog/publish-dialog.component';
import { ReportAutosave } from '../../state/report-autosave';
import { ReportLifecycle } from '../../state/report-lifecycle';
import { ReportSession } from '../../state/report-session';

/**
 * The builder's one primary action: publish the draft as a new version.
 *
 * A checked-out draft is itself the pending version, so it can be published as
 * soon as it's loaded, valid, and fully saved — no edit in this session is
 * required. Publishing snapshots the server-side draft, so it's held back while a
 * save is still in flight or has failed, and while the report has validation
 * errors. The button's enabled state and tooltip carry that status on their own.
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
  private readonly session = inject(ReportSession);
  private readonly autosave = inject(ReportAutosave);
  private readonly lifecycle = inject(ReportLifecycle);
  private readonly dialog = inject(Dialog);

  /** A draft is loaded and being edited — the checked-out draft is itself what would be published. */
  private readonly draftLoaded = computed(() => this.session.model() !== null);

  /** True once every edit has reached the server, so a publish snapshots the latest. */
  private readonly allSaved = computed(
    () => !this.session.dirty() && !this.autosave.saving() && !this.autosave.saveFailed(),
  );

  /**
   * A loaded draft can be published as soon as it's valid and fully saved — no
   * edit in this session is required, since the checked-out draft is already the
   * pending version. Publishing snapshots the server-side draft, so it's held
   * back while a save is still in flight or has failed.
   */
  protected readonly canPublish = computed(
    () => this.draftLoaded() && this.session.isValid() && this.allSaved(),
  );

  protected readonly title = computed(() => {
    if (!this.draftLoaded()) return 'Loading the draft…';
    if (!this.session.isValid()) return 'Fix errors before publishing';
    if (this.autosave.saveFailed()) return "Your last change hasn't saved yet — publishing is blocked until it does";
    if (!this.allSaved()) return 'Waiting for your changes to finish saving…';
    return 'Publish this draft as a new version';
  });

  protected publish(): void {
    const ref = this.dialog.open<string | null>(PublishDialogComponent);
    ref.closed.subscribe((notes) => {
      // undefined means the dialog was cancelled or dismissed.
      if (notes === undefined) return;
      this.lifecycle.publish(notes);
    });
  }
}

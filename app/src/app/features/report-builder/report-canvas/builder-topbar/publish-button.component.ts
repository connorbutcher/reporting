import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject } from '@angular/core';
import { PublishDialogComponent } from '../../publish-dialog/publish-dialog.component';
import { ReportBuilderStore } from '../../report-builder.store';

/**
 * The builder's one primary action: publish the draft as a new version. Carries
 * its own "there are unpublished changes" signal as a dot, so no separate status
 * chip is needed — the button both shows the state and acts on it.
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
      @if (canPublish()) {
        <span class="dot" aria-hidden="true"></span>
      }
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
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #fde68a;
      }
    `,
  ],
})
export class PublishButtonComponent {
  private readonly store = inject(ReportBuilderStore);
  private readonly dialog = inject(Dialog);

  protected readonly canPublish = computed(
    () => this.store.hasUnpublishedChanges() && this.store.isValid(),
  );

  protected readonly title = computed(() => {
    if (!this.store.isValid()) return 'Fix errors before publishing';
    if (!this.store.hasUnpublishedChanges()) return 'No changes to publish';
    return 'Publish this draft as a new version';
  });

  protected publish(): void {
    const ref = this.dialog.open<string | null>(PublishDialogComponent);
    ref.closed.subscribe((notes) => {
      // undefined means the dialog was cancelled or dismissed.
      if (notes === undefined) return;
      this.store.publish(notes);
    });
  }
}

import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublishDialogComponent } from '../../publish-dialog/publish-dialog.component';
import { ReportBuilderStore } from '../../report-builder.store';

/**
 * The builder's title bar: report name and grid summary, undo/redo, the
 * save-state and validation indicators, dataset management, and the publish action.
 */
@Component({
  selector: 'app-builder-toolbar',
  imports: [RouterLink],
  templateUrl: './builder-toolbar.component.html',
  styleUrl: './builder-toolbar.component.scss',
})
export class BuilderToolbarComponent {
  protected readonly store = inject(ReportBuilderStore);
  private readonly dialog = inject(Dialog);

  /** This report's id, for the link to its dataset editor. */
  protected readonly reportId = computed(() => this.store.model()?.reportId ?? null);

  protected readonly statusLabel = computed(() => {
    if (this.store.saveBlocked()) return 'Not saving — fix errors';

    const errors = this.store.errors().length;
    const warnings = this.store.warnings().length;
    if (errors) return `${errors} error${errors > 1 ? 's' : ''}`;
    if (warnings) return `${warnings} warning${warnings > 1 ? 's' : ''}`;
    return 'No issues';
  });

  protected readonly publishTitle = computed(() => {
    if (!this.store.isValid()) return 'Fix errors before publishing';
    if (!this.store.hasUnpublishedChanges()) return 'No changes to publish';
    return 'Publish this draft as a new version';
  });

  protected readonly saveStatus = computed(() => {
    if (this.store.saveFailed())
      return { label: 'Save failed', icon: 'pi-exclamation-circle', variant: 'error' };
    if (this.store.saving())
      return { label: 'Saving…', icon: 'pi-spin pi-spinner', variant: 'pending' };
    if (this.store.dirty())
      return { label: 'Unsaved changes', icon: 'pi-circle-fill', variant: 'pending' };
    return { label: 'Saved', icon: 'pi-check', variant: 'ok' };
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

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { WidgetExportActionsComponent } from '../widget-export-actions/widget-export-actions.component';
import { WidgetOutletDirective } from '../widget-outlet.directive';
import { WidgetFullscreenDialogData } from './widget-fullscreen-dialog-data';

/**
 * Re-renders one widget at near-fullscreen size, opened from its grid header's
 * "view full screen" button. Needs no size-awareness of its own — it feeds the
 * same outlet the grid does, just with more room to draw in.
 */
@Component({
  selector: 'app-widget-fullscreen-dialog',
  imports: [WidgetExportActionsComponent, WidgetOutletDirective],
  templateUrl: './widget-fullscreen-dialog.component.html',
  styleUrl: './widget-fullscreen-dialog.component.scss',
})
export class WidgetFullscreenDialogComponent {
  protected readonly data = inject<WidgetFullscreenDialogData>(DIALOG_DATA);

  private readonly dialogRef = inject(DialogRef<void>);

  protected close(): void {
    this.dialogRef.close();
  }
}

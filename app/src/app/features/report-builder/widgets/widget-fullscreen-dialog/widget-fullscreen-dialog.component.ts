import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { FilterGroup } from '../../../../core/models/filter';
import { Widget } from '../../../../core/models/report';
import { WidgetExportActionsComponent } from '../widget-export-actions/widget-export-actions.component';
import { WidgetOutletDirective, WidgetOutputHandler } from '../widget-outlet.directive';

/**
 * What a widget's header hands this dialog to re-render the same widget at full
 * size. Every reactive value is read through a function rather than passed as a
 * plain value, so the dialog stays live if the underlying report changes while
 * it's open — calling the host's own signal from here still tracks it.
 */
export interface WidgetFullscreenDialogData {
  widget: () => Widget;
  title: () => string;
  reportFilter: () => FilterGroup | null;
  widgetFilter: () => FilterGroup | null;
  bindingFilters: () => Record<string, FilterGroup | null> | null;
  datasetVersion: () => number;
  widgetOutputs: Record<string, WidgetOutputHandler>;
}

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

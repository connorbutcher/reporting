import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { WidgetDataDialogData } from './widget-data-dialog-data';

/** A widget's values as a table, opened from the "View data" action in its header. */
@Component({
  selector: 'app-widget-data-dialog',
  templateUrl: './widget-data-dialog.component.html',
  styleUrl: './widget-data-dialog.component.scss',
})
export class WidgetDataDialogComponent {
  public readonly data = inject<WidgetDataDialogData>(DIALOG_DATA);

  private readonly dialogRef = inject(DialogRef<void>);

  public close(): void {
    this.dialogRef.close();
  }
}

import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
}

/** Generic confirm/cancel prompt, used for destructive actions like delete. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  public readonly data = inject<ConfirmDialogData>(DIALOG_DATA);

  private readonly dialogRef = inject(DialogRef<boolean>);

  public confirm(): void {
    this.dialogRef.close(true);
  }

  public cancel(): void {
    this.dialogRef.close(false);
  }
}

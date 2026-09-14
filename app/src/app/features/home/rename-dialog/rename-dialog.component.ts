import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export interface RenameDialogData {
  kind: 'folder' | 'report';
  currentName: string;
}

/** Prompts for a new name, pre-filled and pre-selected with the current one. */
@Component({
  selector: 'app-rename-dialog',
  imports: [FormsModule],
  templateUrl: './rename-dialog.component.html',
  styleUrl: './rename-dialog.component.scss',
})
export class RenameDialogComponent implements AfterViewInit {
  public readonly data = inject<RenameDialogData>(DIALOG_DATA);
  public readonly name = signal(this.data.currentName);

  private readonly dialogRef = inject(DialogRef<string | undefined>);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  public ngAfterViewInit(): void {
    const input = this.nameInput().nativeElement;
    input.focus();
    input.select();
  }

  public save(): void {
    const name = this.name().trim();
    if (!name) return;
    this.dialogRef.close(name);
  }

  public cancel(): void {
    this.dialogRef.close();
  }
}

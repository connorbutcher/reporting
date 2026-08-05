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
  private readonly dialogRef = inject(DialogRef<string | undefined>);
  protected readonly data = inject<RenameDialogData>(DIALOG_DATA);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly name = signal(this.data.currentName);

  ngAfterViewInit(): void {
    const input = this.nameInput().nativeElement;
    input.focus();
    input.select();
  }

  protected save(): void {
    const name = this.name().trim();
    if (!name) return;
    this.dialogRef.close(name);
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}

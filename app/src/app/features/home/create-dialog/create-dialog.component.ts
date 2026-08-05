import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';

export type CreateKind = 'folder' | 'report';

export interface CreateDialogResult {
  kind: CreateKind;
  name: string;
}

/** Lets the user pick folder-vs-report and name it in one step, before creating either. */
@Component({
  selector: 'app-create-dialog',
  imports: [FormsModule],
  templateUrl: './create-dialog.component.html',
  styleUrl: './create-dialog.component.scss',
})
export class CreateDialogComponent implements AfterViewInit {
  private readonly dialogRef = inject(DialogRef<CreateDialogResult | undefined>);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly kind = signal<CreateKind>('report');
  protected readonly name = signal('');

  ngAfterViewInit(): void {
    this.nameInput().nativeElement.focus();
  }

  protected selectKind(kind: CreateKind): void {
    this.kind.set(kind);
  }

  protected create(): void {
    const name = this.name().trim();
    if (!name) return;
    this.dialogRef.close({ kind: this.kind(), name });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}

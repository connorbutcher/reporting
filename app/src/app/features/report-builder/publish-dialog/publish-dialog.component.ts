import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import Quill from 'quill';

/**
 * Asks what changed before publishing. Closes with the HTML, `null` if empty, or `undefined` if
 * cancelled.
 */
@Component({
  selector: 'app-publish-dialog',
  imports: [],
  templateUrl: './publish-dialog.component.html',
  styleUrl: './publish-dialog.component.scss',
})
export class PublishDialogComponent implements AfterViewInit, OnDestroy {
  private readonly dialogRef = inject(DialogRef<string | null>);
  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editor');
  private quill?: Quill;

  public ngAfterViewInit(): void {
    this.quill = new Quill(this.editorHost().nativeElement, {
      theme: 'snow',
      placeholder: 'What changed in this version?',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'clean'],
        ],
      },
    });
  }

  public ngOnDestroy(): void {
    this.quill = undefined;
  }

  public publish(): void {
    const isEmpty = (this.quill?.getText().trim().length ?? 0) === 0;
    this.dialogRef.close(isEmpty ? null : (this.quill?.getSemanticHTML() ?? null));
  }

  public cancel(): void {
    this.dialogRef.close();
  }
}

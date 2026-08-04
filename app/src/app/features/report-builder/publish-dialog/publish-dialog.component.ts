import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import Quill from 'quill';

/**
 * Prompts for a rich-text description of what changed before publishing.
 * Closes with the entered HTML, `null` if left empty, or `undefined` if
 * cancelled/dismissed — the caller only publishes when the result isn't
 * `undefined`.
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

  ngAfterViewInit(): void {
    this.quill = new Quill(this.editorHost().nativeElement, {
      theme: 'snow',
      placeholder: 'What changed in this version?',
      modules: {
        toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'clean']],
      },
    });
  }

  ngOnDestroy(): void {
    this.quill = undefined;
  }

  protected publish(): void {
    const isEmpty = (this.quill?.getText().trim().length ?? 0) === 0;
    this.dialogRef.close(isEmpty ? null : (this.quill?.getSemanticHTML() ?? null));
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}

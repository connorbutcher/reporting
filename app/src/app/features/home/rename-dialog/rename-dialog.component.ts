import { AfterViewInit, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { form, required, validateHttp } from '@angular/forms/signals';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { skipHttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';

export interface RenameDialogData {
  kind: 'folder' | 'report';
  id: number;
  currentName: string;
  /** The folder this item currently sits in (null = Home) — the name must stay unique among its siblings there. */
  folderId: number | null;
}

/**
 * Prompts for a new name, pre-filled and pre-selected with the current one. Unlike the create
 * dialog, there's no prefetched sibling list to check against instantly, so uniqueness relies
 * entirely on the authoritative server check — same one the create dialog falls back on for
 * siblings it can't see.
 */
@Component({
  selector: 'app-rename-dialog',
  templateUrl: './rename-dialog.component.html',
  styleUrl: './rename-dialog.component.scss',
})
export class RenameDialogComponent implements AfterViewInit {
  public readonly data = inject<RenameDialogData>(DIALOG_DATA);

  public readonly form = form(signal({ name: this.data.currentName }), (path) => {
    required(path.name, { message: 'A name is required.' });
    validateHttp<string, { available: boolean }>(path.name, {
      when: ({ value }) => value().trim().length > 0,
      request: ({ value }) => ({
        url: this.data.kind === 'folder' ? '/api/folders/name-available' : '/api/reports/name-available',
        params: {
          name: value().trim(),
          excludeId: this.data.id,
          ...(this.data.folderId == null
            ? {}
            : this.data.kind === 'folder'
              ? { parentFolderId: this.data.folderId }
              : { folderId: this.data.folderId }),
        } as Record<string, string | number>,
        context: skipHttpErrorNotification(),
      }),
      debounce: 400,
      onSuccess: (result, { value }) =>
        result.available
          ? []
          : [
              {
                kind: 'duplicate',
                message: `A ${this.data.kind} called "${value().trim()}" already exists here.`,
              },
            ],
      onError: () => [],
    });
  });

  /** The duplicate-name message, shown as it's typed (never the plain "required"). */
  public readonly nameError = computed(
    () =>
      this.form
        .name()
        .errors()
        .find((e) => e.kind === 'duplicate')?.message ?? null,
  );

  private readonly dialogRef = inject(DialogRef<string | undefined>);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  public ngAfterViewInit(): void {
    const input = this.nameInput().nativeElement;
    input.focus();
    input.select();
  }

  public save(): void {
    const name = this.form.name().value().trim();
    if (!this.form().valid() || !name) return;
    this.dialogRef.close(name);
  }

  public cancel(): void {
    this.dialogRef.close();
  }
}

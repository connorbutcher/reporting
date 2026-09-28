import { HttpErrorResponse } from '@angular/common/http';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormulaApiService } from '../../../../core/api/formula-api.service';
import { DatasetColumn, DatasetColumnType } from '../../../../core/models/dataset';
import { NotificationService } from '../../../../core/services/notification.service';
import { naturalColumnType } from '../model';
import { FormulaBuilderData } from './formula-builder-data';
import { FormulaChecking } from './formula-checking';
import { FormulaColumnForm } from './formula-column-form';
import { FormulaDocument } from './formula-document';

/** Validates the column as a whole and saves it, closing the dialog with the saved column. */
@Injectable()
export class FormulaSaver {
  public readonly saving = signal(false);
  public readonly saveError = signal<string | null>(null);

  /** The column type the result will be stored as, or null when it must still be chosen. */
  public readonly resultType = computed<DatasetColumnType | null>(() => {
    const chosen = this.columnForm.chosenType();
    return chosen === 'auto' ? naturalColumnType(this.checking.resultKind()) : chosen;
  });

  private readonly data = inject<FormulaBuilderData>(DIALOG_DATA);
  private readonly api = inject(FormulaApiService);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject<DialogRef<DatasetColumn | undefined>>(DialogRef);
  private readonly document = inject(FormulaDocument);
  private readonly checking = inject(FormulaChecking);
  private readonly columnForm = inject(FormulaColumnForm);

  constructor() {
    // An edit makes a "fix the problems" message out of date.
    effect(() => {
      this.document.root();
      untracked(() => {
        this.saveError.set(null);
      });
    });
  }

  public save(): void {
    this.saveError.set(null);
    this.columnForm.nameForm.name().markAsTouched();

    const refusal = this.reasonNotToSave();
    if (refusal) {
      this.saveError.set(refusal);
      return;
    }

    if (!this.columnForm.nameForm().valid()) {
      return;
    }

    const body = {
      name: this.columnForm.nameForm.name().value().trim(),
      expression: this.checking.serialized().text,
      type: this.columnForm.typeToSend(),
    };
    const request = this.data.column
      ? this.api.updateColumn(this.data.datasetId, this.data.column.id, body)
      : this.api.addColumn(this.data.datasetId, body);

    this.saving.set(true);
    request.subscribe({
      next: (column) => {
        this.dialogRef.close(column);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.reportFailure(err);
      },
    });
  }

  public cancel(): void {
    this.dialogRef.close(undefined);
  }

  /** Why the formula can't be saved yet, or null when it can. A bad name is shown on the name field instead. */
  private reasonNotToSave(): string | null {
    if (!this.columnForm.nameForm().valid()) {
      return null;
    }

    if (this.document.root().length === 0) {
      return 'Add a formula first.';
    }

    const problems = this.checking.issues().length;
    if (problems > 0) {
      return `Fix ${problems === 1 ? 'the problem' : `the ${problems} problems`} before saving.`;
    }

    if (!this.checking.serialized().complete) {
      return 'Fill in the empty slots before saving.';
    }

    return this.checking.previewing() ? 'Still checking the formula — try again in a moment.' : null;
  }

  /** The server explains a rejected formula in its response text; show that here, beside the formula. */
  private reportFailure(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 400 && typeof err.error === 'string' && err.error) {
      this.saveError.set(err.error);
    } else {
      this.notify.apiError(err, "Couldn't save the formula column. Please try again.");
    }
  }
}

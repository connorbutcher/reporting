import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Injectable, inject, signal } from '@angular/core';
import { form, required, validate } from '@angular/forms/signals';
import { DatasetColumnType } from '../../../../core/models/dataset';
import { FormulaBuilderData } from './formula-builder-data';

const BRACKETS = /[[\]]/;

/** The column's name (validated) and its chosen type. */
@Injectable()
export class FormulaColumnForm {
  public readonly nameForm = form(signal({ name: inject<FormulaBuilderData>(DIALOG_DATA).column?.name ?? '' }), (path) => {
    required(path.name, { message: 'A column name is required.' });
    validate(path.name, ({ value }) => {
      return this.nameProblem(value().trim());
    });
  });

  /** The column type chosen by the user, or 'auto' to take the type the formula produces. */
  public readonly chosenType = signal<DatasetColumnType | 'auto'>('auto');

  private readonly data = inject<FormulaBuilderData>(DIALOG_DATA);

  /** The type to send to the server: null asks for the one the formula produces. */
  public typeToSend(): DatasetColumnType | null {
    const chosen = this.chosenType();
    return chosen === 'auto' ? null : chosen;
  }

  private nameProblem(name: string): { kind: string; message: string } | null {
    if (BRACKETS.test(name)) {
      return { kind: 'brackets', message: "A name can't contain [ or ], so formulas couldn't refer to it." };
    }

    const taken = this.data.columns.some((column) => column.id !== this.data.column?.id && column.name.toLowerCase() === name.toLowerCase());
    return taken ? { kind: 'duplicate', message: `A column named "${name}" already exists.` } : null;
  }
}

import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Injectable, inject, signal } from '@angular/core';
import { FormulaParseError, ROOT, naturalColumnType, parseFormula } from '../model';
import { FormulaBuilderData } from './formula-builder-data';
import { FormulaCatalogue } from './formula-catalogue';
import { FormulaChecking } from './formula-checking';
import { FormulaColumnForm } from './formula-column-form';
import { FormulaDocument } from './formula-document';
import { FormulaInteraction } from './formula-interaction';

/** Loads the catalogue and, when editing, reads the column's saved formula back into blocks. */
@Injectable()
export class FormulaLoader {
  /** Set when a saved formula couldn't be read back into blocks. */
  public readonly loadError = signal<string | null>(null);

  private readonly data = inject<FormulaBuilderData>(DIALOG_DATA);
  private readonly catalogue = inject(FormulaCatalogue);
  private readonly document = inject(FormulaDocument);
  private readonly interaction = inject(FormulaInteraction);
  private readonly checking = inject(FormulaChecking);
  private readonly columnForm = inject(FormulaColumnForm);

  constructor() {
    this.catalogue.load(() => {
      this.loadExisting();
    });
  }

  /** Opens the column being edited: reads its saved formula back into blocks and takes its type. */
  private loadExisting(): void {
    const existing = this.data.column;
    if (!existing?.formula) {
      return;
    }

    try {
      this.document.load(parseFormula(existing.formula, this.catalogue.scope().functions));
      this.interaction.active.set(ROOT);
    } catch (error) {
      this.loadError.set(error instanceof FormulaParseError ? error.message : 'The formula could not be read.');
      return;
    }

    const natural = naturalColumnType(this.checking.resultKind());
    this.columnForm.chosenType.set(natural === existing.type ? 'auto' : existing.type);
  }
}

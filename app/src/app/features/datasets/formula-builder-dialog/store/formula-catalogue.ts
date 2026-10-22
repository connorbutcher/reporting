import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Injectable, computed, inject, signal } from '@angular/core';
import { FormulaApiService } from '../../../../core/api/formula-api.service';
import { DatasetColumn, FormulaFunction } from '../../../../core/models/dataset';
import { FormulaChecker } from '../model';
import { FormulaBuilderData } from './formula-builder-data';

/** The functions the palette offers (from the server) and the columns a formula may read. */
@Injectable()
export class FormulaCatalogue {
  public readonly functions = signal<FormulaFunction[]>([]);
  public readonly state = signal<'loading' | 'ready' | 'failed'>('loading');

  public readonly columns = FormulaCatalogue.readableColumns(
    inject<FormulaBuilderData>(DIALOG_DATA),
  );

  public readonly scope = computed(() => FormulaChecker.scope(this.functions(), this.columns));

  private readonly api = inject(FormulaApiService);
  /** The columns a formula may read: all of the dataset's, except the one being defined. */
  private static readableColumns(data: FormulaBuilderData): DatasetColumn[] {
    return data.columns.filter((column) => column.id !== data.column?.id);
  }

  /** Fetches the catalogue; `onLoaded` runs once it is there. */
  public load(onLoaded: () => void): void {
    this.api.functions().subscribe({
      next: (functions) => {
        this.functions.set(functions);
        this.state.set('ready');
        onLoaded();
      },
      error: () => {
        this.state.set('failed');
      },
    });
  }
}

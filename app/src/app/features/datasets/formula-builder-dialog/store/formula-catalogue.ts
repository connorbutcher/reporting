import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Injectable, computed, inject, signal } from '@angular/core';
import { FormulaApiService } from '../../../../core/api/formula-api.service';
import { FormulaFunction } from '../../../../core/models/dataset';
import { scopeOf } from '../model';
import { FormulaBuilderData } from './formula-builder-data';
import { readableColumns } from './readable-columns';

/** The functions the palette offers (from the server) and the columns a formula may read. */
@Injectable()
export class FormulaCatalogue {
  public readonly functions = signal<FormulaFunction[]>([]);
  public readonly state = signal<'loading' | 'ready' | 'failed'>('loading');

  public readonly columns = readableColumns(inject<FormulaBuilderData>(DIALOG_DATA));

  public readonly scope = computed(() => scopeOf(this.functions(), this.columns));

  private readonly api = inject(FormulaApiService);

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

import { Directive, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { FilterApiService } from '../../../core/api/filter-api.service';
import { DatasetColumn } from '../../../core/models/dataset';
import { FilterNode, FilterDescription } from '../../../core/models/filter';
import { WidgetExportBase } from './widget-export-base';

/**
 * Shared by widgets that query a dataset. The outlet sets `filterable` only when the host handles
 * {@link filterRequest} (the viewer does, the builder doesn't).
 */
@Directive()
export abstract class DataWidgetBase extends WidgetExportBase {
  public readonly filterable = input(false);

  public readonly filterRequest = output<void>();

  /** Operator wording from the API, cached app-wide; null until it arrives. */
  private readonly operators = toSignal(
    inject(FilterApiService)
      .operators()
      .pipe(catchError(() => of(null))),
    { initialValue: null },
  );

  public describeFilters(
    filters: readonly (FilterNode | null)[],
    columns: readonly DatasetColumn[],
  ): string[] {
    const catalogue = this.operators();
    return [...new Set(filters.flatMap((f) => FilterDescription.describe(f, columns, catalogue)))];
  }
}

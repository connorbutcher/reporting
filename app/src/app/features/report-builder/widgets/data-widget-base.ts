import { Directive, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { FilterApiService } from '../../../core/api/filter-api.service';
import { DatasetColumn } from '../../../core/models/dataset';
import { FilterNode, describeFilter } from '../../../core/models/filter';
import { WidgetExportBase } from './widget-export-base';

/**
 * What the widgets that query a dataset (table, pivot, chart) share beyond exporting: a way for the
 * host to be asked for this widget's filters, and the wording of what is currently filtering it.
 *
 * `filterable` is switched on by the outlet only when the host handles {@link filterRequest} — the
 * viewer does (it opens the filters panel on that widget), the builder doesn't (its filters live in
 * the side panel) — so the count bar is a button exactly where clicking it does something.
 */
@Directive()
export abstract class DataWidgetBase extends WidgetExportBase {
  public readonly filterable = input(false);

  /** The reader asked to see this widget's filters (the count bar was clicked). */
  public readonly filterRequest = output<void>();

  /** Operator wording from the API, cached app-wide; null until it arrives (or if it can't). */
  private readonly operators = toSignal(
    inject(FilterApiService)
      .operators()
      .pipe(catchError(() => of(null))),
    { initialValue: null },
  );

  /** The active filters as readable lines for the count bar's hover text. */
  public describeFilters(
    filters: readonly (FilterNode | null)[],
    columns: readonly DatasetColumn[],
  ): string[] {
    const catalogue = this.operators();
    return [...new Set(filters.flatMap((f) => describeFilter(f, columns, catalogue)))];
  }
}

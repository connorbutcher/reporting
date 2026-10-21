import { effect, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, merge, switchMap } from 'rxjs';
import { DatasetColumn } from '../../../core/models/dataset';
import { WidgetDataSourceOptions } from './widget-data-source-options';

/**
 * Loads a widget's schema and runs its debounced, cancel-on-supersede query pipeline. Each widget
 * decides when to reload: {@link reloadNow} for discrete interactions, {@link reloadDebounced}
 * for typing. Construct in an injection context so it's torn down with the widget.
 */
export class WidgetDataSource<T> {
  private static readonly DEFAULT_DEBOUNCE_MS = 300;

  private readonly interactionQueue = new Subject<void>();
  private readonly filterQueue = new Subject<void>();

  readonly columns = signal<DatasetColumn[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly result = signal<T | null>(null);

  constructor(private readonly options: WidgetDataSourceOptions<T>) {
    // The schema changes only with the dataset, so it loads immediately.
    effect((onCleanup) => {
      const datasetId = options.datasetId();
      options.version();

      if (!datasetId) {
        this.columns.set([]);
        return;
      }

      untracked(() => options.onSchemaLoad?.());

      const subscription = options.api.getSchema(datasetId).subscribe({
        next: (schema) => this.columns.set(schema.columns),
        error: () => this.error.set(true),
      });

      onCleanup(() => subscription.unsubscribe());
    });

    merge(
      this.interactionQueue,
      this.filterQueue.pipe(
        debounceTime(options.debounceMs ?? WidgetDataSource.DEFAULT_DEBOUNCE_MS),
      ),
    )
      .pipe(
        switchMap(() => {
          const request = options.fetch();
          if (!request) return EMPTY;

          return request.pipe(
            // Caught inside the switchMap, since an outer error would stop all future reloads.
            catchError(() => {
              this.error.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.loading.set(false);
      });
  }

  reloadNow(): void {
    this.interactionQueue.next();
  }

  reloadDebounced(): void {
    this.filterQueue.next();
  }
}

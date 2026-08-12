import { Signal, effect, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, debounceTime, merge, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { DatasetColumn } from '../../../core/models/dataset.model';

export interface WidgetDataSourceOptions<T> {
  /** The dataset to load, or null when the widget isn't configured yet. */
  datasetId: Signal<string | null>;
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  version: Signal<number>;
  api: DatasetApiService;
  /**
   * Builds the query for the current config, or returns null when there isn't
   * enough to ask (no dataset, missing axes). Read at fire time, inside the
   * pipeline, so it always sees the latest config.
   */
  fetch: () => Observable<T> | null;
  /** Runs (untracked) each time a dataset's schema is about to load — e.g. to seed sort/page. */
  onSchemaLoad?: () => void;
  /** Long enough that typing a filter value settles into one request. */
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * The shared data engine behind the table and chart widgets: it loads a
 * dataset's schema and runs the debounced, cancel-on-supersede query pipeline,
 * exposing `columns`/`loading`/`error`/`result`. Each widget keeps its own
 * effects deciding *when* to reload — immediately for discrete interactions
 * (paging, sorting, switching datasets) via {@link reloadNow}, or coalesced for
 * typing via {@link reloadDebounced} — so their distinct trigger semantics are
 * preserved while the boilerplate lives in one place.
 *
 * Must be constructed in an injection context (a component's field initializer
 * or constructor) so its effect and subscription are torn down with the widget.
 */
export class WidgetDataSource<T> {
  /** Discrete interactions reload immediately. */
  private readonly interactionQueue = new Subject<void>();
  /** Typing a filter value settles into one request instead of one per keystroke. */
  private readonly filterQueue = new Subject<void>();

  readonly columns = signal<DatasetColumn[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly result = signal<T | null>(null);

  constructor(private readonly options: WidgetDataSourceOptions<T>) {
    // The schema describes the widget and changes only with the dataset, so it
    // loads immediately rather than through the debounced query pipeline.
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
      this.filterQueue.pipe(debounceTime(options.debounceMs ?? DEFAULT_DEBOUNCE_MS)),
    )
      .pipe(
        switchMap(() => {
          const request = options.fetch();
          if (!request) return EMPTY;

          return request.pipe(
            // Caught inside the switchMap: an error reaching the outer stream
            // would tear down the subscription and stop all future reloads.
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

  /** Reloads at once, for discrete interactions (paging, sorting, switching datasets). */
  reloadNow(): void {
    this.interactionQueue.next();
  }

  /** Reloads after the debounce, for changes that arrive in a burst (typing a filter value). */
  reloadDebounced(): void {
    this.filterQueue.next();
  }
}

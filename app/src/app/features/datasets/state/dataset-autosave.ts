import { Injectable, computed, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

/**
 * The datasets screen's save-status indicator. Every edit persists immediately
 * through its own endpoint, so there's no deferred-write "dirty" window — the
 * indicator only ever shows saving or failed.
 *
 * Provided at the datasets page alongside {@link DatasetsStore}; the command
 * collaborators inject it and wrap their mutating requests in {@link track}.
 */
@Injectable()
export class DatasetAutosave {
  // A counter (not a boolean) so overlapping edits don't clear the state early.
  private readonly inFlight = signal(0);

  /** True while any save request is in flight, for the save-status indicator. */
  readonly saving = computed(() => this.inFlight() > 0);

  /** True when the last save failed; cleared by the next successful save. */
  readonly saveFailed = signal(false);

  /**
   * Wraps a mutating request so the save-status indicator reflects it: counts it
   * as in-flight for the lifetime of the call, clears the failed flag on success,
   * and raises it on error. Callers still handle their own optimistic rollback.
   */
  track<T>(request: Observable<T>): Observable<T> {
    this.inFlight.update((n) => n + 1);
    return request.pipe(
      tap({
        next: () => this.saveFailed.set(false),
        error: () => this.saveFailed.set(true),
      }),
      finalize(() => this.inFlight.update((n) => n - 1)),
    );
  }
}

import { Injectable, computed, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

@Injectable()
export class DatasetAutosave {
  /** True while any save request is in flight, for the save-status indicator. */
  public readonly saving = computed(() => this.inFlight() > 0);

  /** True when the last save failed; cleared by the next successful save. */
  public readonly saveFailed = signal(false);

  // A counter (not a boolean) so overlapping edits don't clear the state early.
  private readonly inFlight = signal(0);

  /** Tracks a mutation for the save-status indicator. Callers handle their own rollback. */
  public track<T>(request: Observable<T>): Observable<T> {
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

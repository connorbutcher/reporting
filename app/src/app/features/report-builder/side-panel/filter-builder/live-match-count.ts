import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetCountResult, FilterGroup } from '../../../../core/models/filter';

export interface CountKey {
  datasetId: number;
  filter: FilterGroup | null;
}

export type MatchState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; result: DatasetCountResult }
  | { state: 'error' };

const IDLE: MatchState = { state: 'idle' };
const LOADING: MatchState = { state: 'loading' };
const ERROR: MatchState = { state: 'error' };

const DEBOUNCE_MS = 300;

/**
 * The live "matches N of M rows" state for a count key (null when there's nothing to count). A
 * burst of edits makes one request, an unchanged query makes none, counting is server-side, and a
 * failed count becomes `error` rather than throwing. Call in an injection context.
 */
export function liveMatchCount(key: Signal<CountKey | null>, api: DatasetApiService): Signal<MatchState> {
  return toSignal(
    toObservable(key).pipe(
      debounceTime(DEBOUNCE_MS),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap((k) =>
        k === null
          ? of(IDLE)
          : api.countMatches(k.datasetId, k.filter).pipe(
              map((result): MatchState => ({ state: 'ready', result })),
              startWith(LOADING),
              catchError(() => of(ERROR)),
            ),
      ),
    ),
    { initialValue: IDLE },
  );
}

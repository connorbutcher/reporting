import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { CountKey } from './count-key';
import { MatchState } from './match-state';

export class LiveMatchCount {
  private static readonly IDLE: MatchState = { state: 'idle' };

  private static readonly LOADING: MatchState = { state: 'loading' };

  private static readonly ERROR: MatchState = { state: 'error' };

  private static readonly DEBOUNCE_MS = 300;

  /**
   * The live "matches N of M rows" state; null keys count nothing. Bursts of edits make one request and
   * a failure becomes `error`. Call in an injection context.
   */
  public static create(key: Signal<CountKey | null>, api: DatasetApiService): Signal<MatchState> {
    return toSignal(
      toObservable(key).pipe(
        debounceTime(LiveMatchCount.DEBOUNCE_MS),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap((k) =>
          k === null
            ? of(LiveMatchCount.IDLE)
            : api.countMatches(k.datasetId, k.filter).pipe(
                map((result): MatchState => ({ state: 'ready', result })),
                startWith(LiveMatchCount.LOADING),
                catchError(() => of(LiveMatchCount.ERROR)),
              ),
        ),
      ),
      { initialValue: LiveMatchCount.IDLE },
    );
  }
}

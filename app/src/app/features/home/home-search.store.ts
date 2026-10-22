import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ReportApiService } from '../../core/api/report-api.service';
import { ReportSearchResult } from '../../core/models/report';
import { NotificationService } from '../../core/services/notification.service';

/** Debounced whole-tree report search. */
@Injectable()
export class HomeSearchStore {
  private static readonly SEARCH_DEBOUNCE_MS = 300;
  public readonly query = signal('');
  public readonly results = signal<ReportSearchResult[] | null>(null);
  public readonly searching = signal(false);

  private readonly reportApi = inject(ReportApiService);
  private readonly notify = inject(NotificationService);
  private readonly input$ = new Subject<string>();

  constructor() {
    this.input$
      .pipe(
        debounceTime(HomeSearchStore.SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (!trimmed) {
            return of(null);
          }
          this.searching.set(true);
          // Caught inside the switchMap so one error doesn't end the pipeline.
          return this.reportApi.search(trimmed).pipe(
            catchError((err) => {
              this.notify.apiError(err, 'Search failed. Please try again.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.results.set(results);
        this.searching.set(false);
      });
  }

  public onInput(value: string): void {
    this.query.set(value);
    this.input$.next(value);
  }

  public clear(): void {
    this.query.set('');
    this.results.set(null);
  }
}

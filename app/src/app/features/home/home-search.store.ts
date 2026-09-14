import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ReportApiService } from '../../core/api/report-api.service';
import { ReportSearchResult } from '../../core/models/report';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Whole-tree report search, independent of the folder being browsed — pulled out of
 * {@link HomeStore} so the debounce pipeline and its state are self-contained. A
 * component-provided collaborator the facade holds as a field.
 */
@Injectable()
export class HomeSearchStore {
  public readonly query = signal('');
  public readonly results = signal<ReportSearchResult[] | null>(null);
  public readonly searching = signal(false);

  private readonly reportApi = inject(ReportApiService);
  private readonly input$ = new Subject<string>();

  constructor() {
    this.input$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (!trimmed) return of(null);
          this.searching.set(true);
          return this.reportApi.search(trimmed);
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

import { httpResource } from '@angular/common/http';
import { Injectable, Signal, computed, inject, linkedSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, concatMap } from 'rxjs';
import { ReportApiService } from '../../../core/api/report-api.service';
import { ReportViewFiltersState } from '../../../core/models/report';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportViewerStore } from '../report-viewer.store';

/** The reader's own saved filters for this report, as their encoded string. */
@Injectable()
export class SavedViewFilters {
  /** Undefined until loaded (or if that failed); null when nothing is saved. */
  public readonly encoded: Signal<string | null | undefined>;
  public readonly loading = computed(() => this.resource.isLoading());
  public readonly settled = computed(() => this.resource.hasValue() || this.resource.error() != null);
  /** When they failed to load, saving would overwrite filters the reader never saw. */
  public readonly failed = computed(() => this.resource.error() != null);

  private readonly store = inject(ReportViewerStore);
  private readonly api = inject(ReportApiService);
  private readonly notify = inject(NotificationService);
  private readonly resource = httpResource<ReportViewFiltersState>(() =>
    this.store.reportId() ? `/api/reports/${this.store.reportId()}/view-filters` : undefined,
  );
  /** Writable so a save updates it; otherwise a rebuild would read the stale fetch and bring back cleared filters. */
  private readonly value = linkedSignal<string | null | undefined>(() =>
    this.resource.hasValue() ? this.resource.value().filters : undefined,
  );
  /** Saves are queued so two quick edits reach the server in order. */
  private readonly queue = new Subject<{ reportId: number; encoded: string | null }>();
  private failureReported = false;

  constructor() {
    this.encoded = this.value.asReadonly();

    this.queue
      .pipe(
        concatMap(({ reportId, encoded }) =>
          (encoded ? this.api.saveViewFilters(reportId, encoded) : this.api.clearViewFilters(reportId)).pipe(
            catchError((err) => {
              this.notify.apiError(err, "Couldn't save your filters. Please try again.");
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  /** Saves the filters, or clears them when null. Does nothing if the saved ones failed to load. */
  public save(encoded: string | null): void {
    const reportId = this.store.reportId();
    if (reportId === null || this.failed()) return;
    this.value.set(encoded);
    this.queue.next({ reportId, encoded });
  }

  /** Warns once that the saved filters didn't load, so edits won't be kept. */
  public reportFailure(): void {
    if (!this.failed() || this.failureReported) return;
    this.failureReported = true;
    this.notify.warn(
      "Your saved filters couldn't be loaded, so changes you make here won't be saved this visit. Reload to try again.",
    );
  }
}

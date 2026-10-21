import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, filter, map, retry, switchMap, tap } from 'rxjs';
import { ReportApiService } from '../../../core/api/report-api.service';
import { LoggerService } from '../../../core/services/logger.service';
import { UndoHistory } from '../models/undo-history';
import { ReportSession } from './report-session';

/**
 * Keeps the server draft and undo stack in step with the model: every change debounces a coalesced
 * save (superseded writes dropped) and an undo snapshot.
 */
@Injectable()
export class ReportAutosave {
  private static readonly SAVE_DEBOUNCE_MS = 250;
  /** Long enough that a burst of typing is one undo step. */
  private static readonly HISTORY_DEBOUNCE_MS = 400;

  private readonly session = inject(ReportSession);
  private readonly reportApi = inject(ReportApiService);
  private readonly logger = inject(LoggerService);

  private readonly saveQueue = new Subject<void>();
  private readonly historyQueue = new Subject<void>();
  private readonly history = new UndoHistory();

  readonly saving = signal(false);
  /** Lets the canvas warn instead of losing work quietly. */
  readonly saveFailed = signal(false);

  readonly canUndo = this.history.canUndo;
  readonly canRedo = this.history.canRedo;

  constructor() {
    const model = this.session.model;

    // Every edit changes the snapshot, so this one effect covers them all. Reading isValid means fixing
    // an error re-triggers the held-back save.
    effect(() => {
      const current = model();
      if (!current) return;

      const dirty = current.dirty();
      const valid = current.isValid();
      if (!dirty || !valid) return;

      untracked(() => this.saveQueue.next());
    });

    effect(() => {
      const current = model();
      if (!current) return;

      current.serialized();
      untracked(() => this.historyQueue.next());
    });

    this.historyQueue
      .pipe(debounceTime(ReportAutosave.HISTORY_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe(() => {
        const current = model();
        if (current) this.history.capture(current.serialized());
      });

    // switchMap drops superseded writes rather than racing them.
    this.saveQueue
      .pipe(
        debounceTime(ReportAutosave.SAVE_DEBOUNCE_MS),
        // A broken report is never written; the effect above re-queues once it's fixed.
        filter(() => model()?.isValid() ?? false),
        tap(() => this.saving.set(true)),
        switchMap(() => {
          const current = model();
          if (!current) return EMPTY;

          return this.reportApi.updateDraft(current.reportId, current.toDto()).pipe(
            // Ride out network blips; a fresh edit cancels this inner stream and its retries.
            retry({ count: 2, delay: 400 }),
            map(() => current),
            // Caught inside the switchMap, since an error reaching the outer stream would stop all saving.
            catchError((error: unknown) => {
              this.logger.error('Failed to save report draft', error);
              this.saveFailed.set(true);
              this.saving.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((current) => {
        this.saveFailed.set(false);
        this.saving.set(false);
        // An edit made during the request has already queued a save that cancels this one.
        current.markPristine();
      });
  }

  reset(serialized: string): void {
    this.history.reset(serialized);
  }

  undo(): void {
    this.session.restore(this.history.undo());
  }

  redo(): void {
    this.session.restore(this.history.redo());
  }
}

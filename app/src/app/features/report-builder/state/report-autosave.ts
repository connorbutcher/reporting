import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, filter, map, switchMap, tap } from 'rxjs';
import { ReportApiService } from '../../../core/api/report-api.service';
import { ReportRevisionContent } from '../../../core/models/report';
import { UndoHistory } from '../models/undo-history';
import { ReportSession } from './report-session';

const SAVE_DEBOUNCE_MS = 250;
/** Long enough that a burst of typing collapses into one undo step. */
const HISTORY_DEBOUNCE_MS = 400;

/**
 * Keeps the server draft and the undo stack in step with the edited model, so
 * no one else has to think about persistence timing. Watching the model tree, it
 * debounces two things off every change: a write-back to the server (coalesced,
 * with superseded writes dropped) and an undo snapshot.
 *
 * The store just reads {@link saving} / {@link saveFailed} / {@link canUndo} /
 * {@link canRedo}, calls {@link reset} on load, and {@link undo} / {@link redo}
 * for the toolbar — the last two restoring straight into {@link ReportSession}.
 */
@Injectable()
export class ReportAutosave {
  private readonly session = inject(ReportSession);
  private readonly reportApi = inject(ReportApiService);

  private readonly saveQueue = new Subject<void>();
  private readonly historyQueue = new Subject<void>();
  private readonly history = new UndoHistory();

  /** True while a save request is in flight, for a "Saving…" indicator. */
  readonly saving = signal(false);
  /** True when the last save failed, so the canvas can warn instead of losing work quietly. */
  readonly saveFailed = signal(false);

  readonly canUndo = this.history.canUndo;
  readonly canRedo = this.history.canRedo;

  constructor() {
    const model = this.session.model;

    // Any change anywhere in the tree shows up as a new snapshot here, so this
    // one effect covers every edit without each caller remembering to save.
    // Reading isValid too means fixing an error re-triggers the held-back save.
    effect(() => {
      const current = model();
      if (!current) return;

      const dirty = current.dirty();
      const valid = current.isValid();
      if (!dirty || !valid) return;

      untracked(() => this.saveQueue.next());
    });

    // Undo steps are captured from the same snapshot the save uses, so the two
    // always agree on what "the current state" is.
    effect(() => {
      const current = model();
      if (!current) return;

      current.toDto();
      untracked(() => this.historyQueue.next());
    });

    this.historyQueue.pipe(debounceTime(HISTORY_DEBOUNCE_MS), takeUntilDestroyed()).subscribe(() => {
      const current = model();
      if (current) this.history.capture(current.toDto());
    });

    // Saves are coalesced so dragging, typing and toggling stay responsive;
    // switchMap drops superseded writes rather than racing them.
    this.saveQueue
      .pipe(
        debounceTime(SAVE_DEBOUNCE_MS),
        // A broken report is never written; the effect above re-queues once fixed.
        filter(() => model()?.isValid() ?? false),
        tap(() => this.saving.set(true)),
        switchMap(() => {
          const current = model();
          if (!current) return EMPTY;

          return this.reportApi.updateDraft(current.reportId, current.toDto()).pipe(
            map(() => current),
            // Catch inside the switchMap: an error reaching the outer stream
            // would tear down the subscription and silently stop all saving.
            catchError((error: unknown) => {
              console.error('Failed to save report', error);
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
        // Any edit made while the request was in flight has already queued a
        // fresh save, which cancels this one before it can mark it clean.
        current.markPristine();
      });
  }

  /** Starts a fresh undo timeline from a loaded (or freshly published) snapshot. */
  reset(snapshot: ReportRevisionContent): void {
    this.history.reset(snapshot);
  }

  /** Restores the previous snapshot into the session, if there's anything to undo. */
  undo(): void {
    this.session.restore(this.history.undo());
  }

  /** Restores the next snapshot into the session, if there's anything to redo. */
  redo(): void {
    this.session.restore(this.history.redo());
  }
}

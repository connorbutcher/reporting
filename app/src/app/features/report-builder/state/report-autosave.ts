import { DestroyRef, Injector, Signal, effect, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, filter, map, switchMap, tap } from 'rxjs';
import { ReportApiService } from '../../../core/api/report-api.service';
import { ReportRevisionContent } from '../../../core/models/report';
import { ReportModel } from '../models/report.model';
import { UndoHistory } from '../models/undo-history';

const SAVE_DEBOUNCE_MS = 250;
/** Long enough that a burst of typing collapses into one undo step. */
const HISTORY_DEBOUNCE_MS = 400;

/**
 * Keeps the server draft and the undo stack in step with the edited model, so
 * the store never has to think about persistence timing. Watching the model
 * tree, it debounces two things off every change: a write-back to the server
 * (coalesced, with superseded writes dropped) and an undo snapshot.
 *
 * All the rxjs and effect wiring lives here; the store just reads {@link saving}
 * / {@link saveFailed} / {@link canUndo} / {@link canRedo} and calls
 * {@link reset} on load and {@link undo} / {@link redo} for the toolbar.
 */
export class ReportAutosave {
  private readonly saveQueue = new Subject<void>();
  private readonly historyQueue = new Subject<void>();
  private readonly history = new UndoHistory();

  /** True while a save request is in flight, for a "Saving…" indicator. */
  readonly saving = signal(false);
  /** True when the last save failed, so the canvas can warn instead of losing work quietly. */
  readonly saveFailed = signal(false);

  readonly canUndo = this.history.canUndo;
  readonly canRedo = this.history.canRedo;

  constructor(
    private readonly model: Signal<ReportModel | null>,
    private readonly reportApi: ReportApiService,
    injector: Injector,
    destroyRef: DestroyRef,
  ) {
    // Any change anywhere in the tree shows up as a new snapshot here, so this
    // one effect covers every edit without each caller remembering to save.
    // Reading isValid too means fixing an error re-triggers the held-back save.
    effect(
      () => {
        const model = this.model();
        if (!model) return;

        const dirty = model.dirty();
        const valid = model.isValid();
        if (!dirty || !valid) return;

        untracked(() => this.saveQueue.next());
      },
      { injector },
    );

    // Undo steps are captured from the same snapshot the save uses, so the two
    // always agree on what "the current state" is.
    effect(
      () => {
        const model = this.model();
        if (!model) return;

        model.toDto();
        untracked(() => this.historyQueue.next());
      },
      { injector },
    );

    this.historyQueue.pipe(debounceTime(HISTORY_DEBOUNCE_MS), takeUntilDestroyed(destroyRef)).subscribe(() => {
      const model = this.model();
      if (model) this.history.capture(model.toDto());
    });

    // Saves are coalesced so dragging, typing and toggling stay responsive;
    // switchMap drops superseded writes rather than racing them.
    this.saveQueue
      .pipe(
        debounceTime(SAVE_DEBOUNCE_MS),
        // A broken report is never written; the effect above re-queues once fixed.
        filter(() => this.model()?.isValid() ?? false),
        tap(() => this.saving.set(true)),
        switchMap(() => {
          const model = this.model();
          if (!model) return EMPTY;

          return this.reportApi.updateDraft(model.reportId, model.toDto()).pipe(
            map(() => model),
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
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((model) => {
        this.saveFailed.set(false);
        this.saving.set(false);
        // Any edit made while the request was in flight has already queued a
        // fresh save, which cancels this one before it can mark it clean.
        model.markPristine();
      });
  }

  /** Starts a fresh undo timeline from a loaded (or freshly published) snapshot. */
  reset(snapshot: ReportRevisionContent): void {
    this.history.reset(snapshot);
  }

  /** The snapshot to restore for an undo, or null if there's nothing to undo. */
  undo(): ReportRevisionContent | null {
    return this.history.undo();
  }

  /** The snapshot to restore for a redo, or null if there's nothing to redo. */
  redo(): ReportRevisionContent | null {
    return this.history.redo();
  }
}

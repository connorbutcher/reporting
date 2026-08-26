import { computed, signal } from '@angular/core';
import { ReportRevisionContent } from '../../../core/models/report';

/** Plenty for a working session without holding on to unbounded memory. */
const MAX_ENTRIES = 60;

/**
 * A linear undo stack of whole-report snapshots, each a serialized JSON string.
 *
 * The model already memoizes its own serialization ({@link ReportModel.serialized}),
 * so callers pass that string in rather than re-stringifying here — the same value
 * powers the dirty check, so a change is serialized once and shared. Capture is
 * driven on a debounce so a burst of typing collapses into a single undo step
 * rather than one per keystroke.
 */
export class UndoHistory {
  private readonly entries = signal<string[]>([]);
  private readonly index = signal(-1);

  readonly canUndo = computed(() => this.index() > 0);
  readonly canRedo = computed(() => this.index() < this.entries().length - 1);

  /** Starts a fresh timeline from the given serialized state. */
  reset(serialized: string): void {
    this.entries.set([serialized]);
    this.index.set(0);
  }

  /**
   * Records a new serialized state. Restoring produces a snapshot identical to
   * the entry we just moved to, so that case is ignored and undo doesn't get stuck.
   */
  capture(json: string): void {
    const entries = this.entries();
    const index = this.index();
    if (index >= 0 && entries[index] === json) return;

    // A new edit after undoing discards the redo branch.
    const kept = entries.slice(0, index + 1);
    const trimmed = [...kept, json].slice(-MAX_ENTRIES);
    this.entries.set(trimmed);
    this.index.set(trimmed.length - 1);
  }

  undo(): ReportRevisionContent | null {
    if (!this.canUndo()) return null;
    this.index.update((i) => i - 1);
    return this.current();
  }

  redo(): ReportRevisionContent | null {
    if (!this.canRedo()) return null;
    this.index.update((i) => i + 1);
    return this.current();
  }

  private current(): ReportRevisionContent | null {
    const json = this.entries()[this.index()];
    return json ? (JSON.parse(json) as ReportRevisionContent) : null;
  }
}

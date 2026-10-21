import { computed, signal } from '@angular/core';
import { ReportRevisionContent } from '../../../core/models/report';

/**
 * A linear undo stack of serialized report snapshots. Callers pass in the model's memoized
 * serialization and capture on a debounce, so a burst of typing is one undo step.
 */
export class UndoHistory {
  private static readonly MAX_ENTRIES = 60;

  private readonly entries = signal<string[]>([]);
  private readonly index = signal(-1);

  readonly canUndo = computed(() => this.index() > 0);
  readonly canRedo = computed(() => this.index() < this.entries().length - 1);

  reset(serialized: string): void {
    this.entries.set([serialized]);
    this.index.set(0);
  }

  /** Ignores a snapshot identical to the current entry, which restoring produces. */
  capture(json: string): void {
    const entries = this.entries();
    const index = this.index();
    if (index >= 0 && entries[index] === json) return;

    // A new edit after undoing discards the redo branch.
    const kept = entries.slice(0, index + 1);
    const trimmed = [...kept, json].slice(-UndoHistory.MAX_ENTRIES);
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

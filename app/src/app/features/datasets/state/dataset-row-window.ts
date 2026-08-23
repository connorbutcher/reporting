import { Injectable, effect, inject, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetRow } from '../../../core/models/dataset.model';
import { DatasetCollection } from './dataset-collection';

/** Rows fetched per window; also the first window loaded eagerly when a dataset is selected. */
const WINDOW = 100;

/**
 * The selected dataset's rows, loaded from the server a window at a time for the
 * editor grid's lazy virtual scroll, so a dataset with thousands of rows never
 * loads into the editor in full. Rows sit in a sparse array sized to the
 * dataset's {@link total} — loaded slots hold the row, others are `undefined` —
 * which is what a PrimeNG lazy virtual scroll table binds to.
 *
 * The first window loads eagerly on selection so the total (and thus the sparse
 * array's size) is known before the grid mounts; the grid waits on {@link ready}
 * to avoid a virtual scroller that can't recompute when the total jumps from 0.
 * Further windows load through {@link load} as the grid scrolls.
 */
@Injectable()
export class DatasetRowWindow {
  private readonly api = inject(DatasetApiService);
  private readonly collection = inject(DatasetCollection);
  private readonly notify = inject(NotificationService);

  /** The sparse row array: length is {@link total}; only loaded windows are filled. */
  private readonly _rows = signal<(DatasetRow | undefined)[]>([]);
  readonly rows = this._rows.asReadonly();

  /** The dataset's full row count, for the grid's scrollbar. */
  private readonly _total = signal(0);
  readonly total = this._total.asReadonly();

  /** True once the first window has loaded, so the grid can mount with a known total. */
  private readonly _ready = signal(false);
  readonly ready = this._ready.asReadonly();

  /** True while a window is loading, for the grid's loading overlay/skeleton. */
  readonly loading = signal(false);

  /** A row index the grid should scroll into view (e.g. a freshly added last row); null when none. */
  readonly scrollTo = signal<number | null>(null);

  // The most recently requested window, and a token so a stale response (from a
  // superseded window or a since-changed selection) is ignored.
  private lastFirst = 0;
  private lastCount = WINDOW;
  private requestSeq = 0;
  // A row index to scroll to once the next window has loaded (e.g. a just-added last row).
  private pendingScroll: number | null = null;

  constructor() {
    // A new selection starts fresh and eagerly loads its first window, so the grid
    // mounts already knowing the total. Clearing first stops the previous
    // dataset's rows from flashing under the new one.
    effect(() => {
      const id = this.collection.selectedId();
      this.requestSeq++;
      this._ready.set(false);
      this._rows.set([]);
      this._total.set(0);
      this.lastFirst = 0;
      this.lastCount = WINDOW;
      this.scrollTo.set(null);
      if (id !== null) this.fetch(id, 0, WINDOW);
    });
  }

  /** Loads `count` rows from `first`; driven by the grid's lazy-load event as it scrolls. */
  load(first: number, count: number): void {
    const id = this.collection.selectedId();
    if (id === null) return;
    this.fetch(id, first, count || WINDOW);
  }

  private fetch(id: number, first: number, count: number): void {
    const seq = ++this.requestSeq;
    this.lastFirst = first;
    this.lastCount = count;
    this.loading.set(true);
    this.api.getRowWindow(id, first, count).subscribe({
      next: ({ total, rows }) => {
        if (seq !== this.requestSeq) return; // A newer request (or selection) superseded this one.
        // Keep the other loaded windows when the total is unchanged; otherwise
        // start a fresh sparse array of the new length.
        const next =
          this._rows().length === total ? [...this._rows()] : new Array<DatasetRow | undefined>(total);
        rows.forEach((row, i) => (next[first + i] = row));
        this._total.set(total);
        this._rows.set(next);
        this._ready.set(true);
        this.loading.set(false);
        if (this.pendingScroll !== null) {
          this.scrollTo.set(this.pendingScroll);
          this.pendingScroll = null;
        }
      },
      error: () => {
        if (seq !== this.requestSeq) return; // A newer request (or selection) superseded this one.
        this.loading.set(false);
        // Let the grid mount on whatever rows already loaded rather than sitting
        // on the skeleton — but tell the user this window didn't load.
        this._ready.set(true);
        this.notify.error("Couldn't load these rows. Scroll again or reopen the dataset.");
      },
    });
  }

  /** Replaces the loaded row with the same id — used for optimistic edits and server confirmations. */
  replaceRow(row: DatasetRow): void {
    this._rows.update((rows) => rows.map((r) => (r?.id === row.id ? row : r)));
  }

  /**
   * Re-seats the grid after a row was added on the server. Rows are ordered by
   * insertion, so the new one is last: remount the grid (the virtual scroller
   * can't grow its scroll size on the fly) onto the final window and scroll to it.
   */
  afterAdd(): void {
    const id = this.collection.selectedId();
    if (id === null) return;
    const newTotal = this._total() + 1;
    this._ready.set(false);
    this.pendingScroll = newTotal - 1;
    this.fetch(id, Math.max(0, newTotal - WINDOW), WINDOW);
  }

  /**
   * Removes a deleted row from the loaded window and shrinks the total, in place —
   * no remount, so the user keeps their scroll position. Later rows shift up as
   * they do on the server; the scroller's size catches up on the next window load.
   */
  removeRow(rowId: string): void {
    this._rows.update((rows) => rows.filter((r) => r?.id !== rowId));
    this._total.update((t) => Math.max(0, t - 1));
  }

  /** Strips a deleted column's value from every loaded row, mirroring the server. */
  stripColumn(columnId: string): void {
    this._rows.update((rows) =>
      rows.map((r) => {
        if (!r) return r;
        const { [columnId]: _removed, ...rest } = r.values;
        return { ...r, values: rest };
      }),
    );
  }
}

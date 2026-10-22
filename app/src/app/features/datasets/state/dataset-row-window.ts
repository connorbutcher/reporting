import { effect, inject, Injectable, Signal, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetRow } from '../../../core/models/dataset';
import { DatasetCollection } from './dataset-collection';

@Injectable()
export class DatasetRowWindow {
  /** Rows fetched per window; also the first window loaded eagerly when a dataset is selected. */
  private static readonly WINDOW = 100;

  public readonly rows: Signal<(DatasetRow | undefined)[]>;

  public readonly total: Signal<number>;

  public readonly ready: Signal<boolean>;

  /** True while a window is loading, for the grid's loading overlay/skeleton. */
  public readonly loading = signal(false);

  /** A row index the grid should scroll into view (e.g. a freshly added last row); null when none. */
  public readonly scrollTo = signal<number | null>(null);

  private readonly api = inject(DatasetApiService);

  private readonly collection = inject(DatasetCollection);

  private readonly notify = inject(NotificationService);

  /** The sparse row array: length is {@link total}; only loaded windows are filled. */
  private readonly _rows = signal<(DatasetRow | undefined)[]>([]);

  /** The dataset's full row count, for the grid's scrollbar. */
  private readonly _total = signal(0);

  /** True once the first window has loaded, so the grid can mount with a known total. */
  private readonly _ready = signal(false);

  // The most recently requested window, and a token so a stale response (from a
  // superseded window or a since-changed selection) is ignored.
  private lastFirst = 0;

  private lastCount = DatasetRowWindow.WINDOW;

  private requestSeq = 0;

  // A row index to scroll to once the next window has loaded (e.g. a just-added last row).
  private pendingScroll: number | null = null;

  constructor() {
    this.rows = this._rows.asReadonly();
    this.total = this._total.asReadonly();
    this.ready = this._ready.asReadonly();
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
      this.lastCount = DatasetRowWindow.WINDOW;
      this.scrollTo.set(null);
      if (id !== null) {
        this.fetch(id, 0, DatasetRowWindow.WINDOW);
      }
    });
  }

  /** Loads `count` rows from `first`; driven by the grid's lazy-load event as it scrolls. */
  public load(first: number, count: number): void {
    const id = this.collection.selectedId();
    if (id === null) {
      return;
    }
    const size = count || DatasetRowWindow.WINDOW;
    // The grid fires its first lazy-load (first = 0) the moment it mounts, which
    // repeats the window already fetched eagerly on selection. Ignore a request
    // identical to the one in flight (or just completed) so it isn't fetched twice.
    if (first === this.lastFirst && size === this.lastCount) {
      return;
    }
    this.fetch(id, first, size);
  }

  /** Starts over from the first window — for after values changed on the server (a formula column recomputed). */
  public reload(): void {
    const id = this.collection.selectedId();
    if (id === null) {
      return;
    }
    this._ready.set(false);
    this.fetch(id, 0, DatasetRowWindow.WINDOW);
  }

  /** Replaces the loaded row with the same id — used for optimistic edits and server confirmations. */
  public replaceRow(row: DatasetRow): void {
    this._rows.update((rows) => rows.map((r) => (r?.id === row.id ? row : r)));
  }

  /**
   * Re-seats the grid after a row was added on the server. Rows are ordered by
   * insertion, so the new one is last: remount the grid (the virtual scroller
   * can't grow its scroll size on the fly) onto the final window and scroll to it.
   */
  public afterAdd(): void {
    const id = this.collection.selectedId();
    if (id === null) {
      return;
    }
    const newTotal = this._total() + 1;
    this._ready.set(false);
    this.pendingScroll = newTotal - 1;
    this.fetch(id, Math.max(0, newTotal - DatasetRowWindow.WINDOW), DatasetRowWindow.WINDOW);
  }

  /**
   * Removes a deleted row from the loaded window and shrinks the total, in place —
   * no remount, so the user keeps their scroll position. Later rows shift up as
   * they do on the server; the scroller's size catches up on the next window load.
   */
  public removeRow(rowId: string): void {
    this._rows.update((rows) => rows.filter((r) => r?.id !== rowId));
    this._total.update((t) => Math.max(0, t - 1));
  }

  /** Strips a deleted column's value from every loaded row, mirroring the server. */
  public stripColumn(columnId: string): void {
    this._rows.update((rows) =>
      rows.map((r) => {
        if (!r) {
          return r;
        }
        const { [columnId]: _removed, ...rest } = r.values;
        return { ...r, values: rest };
      }),
    );
  }

  private fetch(id: number, first: number, count: number): void {
    const seq = ++this.requestSeq;
    this.lastFirst = first;
    this.lastCount = count;
    this.loading.set(true);
    this.api.getRowWindow(id, first, count).subscribe({
      next: ({ total, rows }) => {
        if (seq !== this.requestSeq) {
          return;
        } // A newer request (or selection) superseded this one.
        // Keep the other loaded windows when the total is unchanged; otherwise
        // start a fresh sparse array of the new length.
        const next =
          this._rows().length === total
            ? [...this._rows()]
            : new Array<DatasetRow | undefined>(total);
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
      error: (err) => {
        if (seq !== this.requestSeq) {
          return;
        } // A newer request (or selection) superseded this one.
        this.loading.set(false);
        // Forget the window so an identical follow-up load (e.g. the grid's
        // mount-time lazy-load) isn't deduped away and can retry the failed fetch.
        this.lastFirst = -1;
        this.lastCount = -1;
        // Let the grid mount on whatever rows already loaded rather than sitting
        // on the skeleton — but tell the user this window didn't load.
        this._ready.set(true);
        this.notify.loadError(err, "Couldn't load these rows. Scroll again or reopen the dataset.");
      },
    });
  }
}

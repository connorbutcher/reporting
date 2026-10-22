import { effect, inject, Injectable, Signal, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  DatasetRow,
  DatasetRowWindow as DatasetRowWindowResult,
} from '../../../core/models/dataset';
import { DatasetCollection } from './dataset-collection';

@Injectable()
export class DatasetRowWindow {
  private static readonly WINDOW = 100;

  public readonly rows: Signal<(DatasetRow | undefined)[]>;

  public readonly total: Signal<number>;

  public readonly ready: Signal<boolean>;

  public readonly loading = signal(false);

  /** A row index to scroll into view, or null. */
  public readonly scrollTo = signal<number | null>(null);

  private readonly api = inject(DatasetApiService);

  private readonly collection = inject(DatasetCollection);

  private readonly notify = inject(NotificationService);

  /** Sparse: only loaded windows are filled. */
  private readonly _rows = signal<(DatasetRow | undefined)[]>([]);

  private readonly _total = signal(0);

  private readonly _ready = signal(false);

  // The last requested window, and a token so stale responses are ignored.
  private lastFirst = 0;

  private lastCount = DatasetRowWindow.WINDOW;

  private requestSeq = 0;

  private pendingScroll: number | null = null;

  constructor() {
    this.rows = this._rows.asReadonly();
    this.total = this._total.asReadonly();
    this.ready = this._ready.asReadonly();
    // Clears first so the previous dataset's rows don't flash, then eagerly loads the first window.
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

  public load(first: number, count: number): void {
    const id = this.collection.selectedId();
    if (id === null) {
      return;
    }
    const size = count || DatasetRowWindow.WINDOW;
    // The grid's first lazy-load repeats the eager fetch, so skip identical requests.
    if (first === this.lastFirst && size === this.lastCount) {
      return;
    }
    this.fetch(id, first, size);
  }

  /** Starts over, e.g. after a formula column recomputed. */
  public reload(): void {
    const id = this.collection.selectedId();
    if (id === null) {
      return;
    }
    this._ready.set(false);
    this.fetch(id, 0, DatasetRowWindow.WINDOW);
  }

  public replaceRow(row: DatasetRow): void {
    this._rows.update((rows) => rows.map((r) => (r?.id === row.id ? row : r)));
  }

  /** The new row is last, and the scroller can't grow in place, so remount on the final window. */
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

  /** Removes in place so the scroll position is kept. */
  public removeRow(rowId: string): void {
    this._rows.update((rows) => rows.filter((r) => r?.id !== rowId));
    this._total.update((t) => Math.max(0, t - 1));
  }

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
      next: (window) => {
        if (seq === this.requestSeq) {
          this.applyWindow(first, window);
        }
      },
      error: (err) => {
        if (seq === this.requestSeq) {
          this.failWindow(err);
        }
      },
    });
  }

  private applyWindow(first: number, { total, rows }: DatasetRowWindowResult): void {
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
  }

  /** Forgets the window so a retry isn't skipped, and lets the grid mount on what's loaded. */
  private failWindow(err: unknown): void {
    this.loading.set(false);
    this.lastFirst = -1;
    this.lastCount = -1;
    this._ready.set(true);
    this.notify.loadError(err, "Couldn't load these rows. Scroll again or reopen the dataset.");
  }
}

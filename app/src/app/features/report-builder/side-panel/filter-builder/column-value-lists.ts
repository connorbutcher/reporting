import { DestroyRef, Injectable, Signal, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';

/** A column's distinct values, fetched on demand and cached by column id. One builder edits one dataset. */
@Injectable()
export class ColumnValueLists {
  private readonly api = inject(DatasetApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lists = new Map<string, WritableSignal<string[]>>();
  private readonly requested = new Set<string>();

  /** Empty until loaded. */
  public valuesFor(columnId: string): Signal<string[]> {
    let list = this.lists.get(columnId);
    if (!list) this.lists.set(columnId, (list = signal<string[]>([])));
    return list;
  }

  /** Fetches once per column; later calls do nothing. */
  public load(datasetId: number, columnId: string): void {
    if (this.requested.has(columnId)) return;
    this.requested.add(columnId);

    const list = this.lists.get(columnId) ?? signal<string[]>([]);
    this.lists.set(columnId, list);
    this.api
      .columnValues(datasetId, columnId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((values) => list.set(values));
  }
}

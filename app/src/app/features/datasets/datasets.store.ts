import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import {
  DatasetColumn,
  DatasetColumnType,
  DatasetRow,
  DatasetSummary,
} from '../../core/models/dataset.model';

/**
 * State and CRUD for the datasets screen. Provided at the page so the list
 * sidebar and the editor share one instance, keeping every mutation in one
 * place while the components stay presentational.
 */
@Injectable()
export class DatasetsStore {
  private readonly api = inject(DatasetApiService);

  readonly datasets = signal<DatasetSummary[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly columns = signal<DatasetColumn[]>([]);
  readonly rows = signal<DatasetRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly selected = computed(
    () => this.datasets().find((d) => d.id === this.selectedId()) ?? null,
  );

  loadDatasets(selectId?: string): void {
    this.api.list().subscribe({
      next: (datasets) => {
        this.datasets.set(datasets);
        const next = selectId ?? this.selectedId() ?? datasets[0]?.id ?? null;
        if (next && datasets.some((d) => d.id === next)) this.select(next);
        else this.selectedId.set(null);
      },
      error: () => this.error.set('Could not load datasets.'),
    });
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.loading.set(true);
    this.error.set(null);

    forkJoin({ schema: this.api.getSchema(id), data: this.api.getData(id) }).subscribe({
      next: ({ schema, data }) => {
        this.columns.set(schema.columns);
        this.rows.set(data.rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load that dataset.');
        this.loading.set(false);
      },
    });
  }

  // --- datasets -------------------------------------------------------------

  createDataset(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.api.create(trimmed).subscribe((dataset) => this.loadDatasets(dataset.id));
  }

  renameDataset(name: string): void {
    const id = this.selectedId();
    if (!id || !name.trim()) return;
    this.api.rename(id, name.trim()).subscribe(() => this.loadDatasets(id));
  }

  deleteDataset(): void {
    const id = this.selectedId();
    if (!id) return;

    this.api.remove(id).subscribe(() => {
      this.selectedId.set(null);
      this.columns.set([]);
      this.rows.set([]);
      this.loadDatasets();
    });
  }

  // --- columns --------------------------------------------------------------

  addColumn(name: string, type: DatasetColumnType): void {
    const id = this.selectedId();
    const trimmed = name.trim();
    if (!id || !trimmed) return;

    this.api.addColumn(id, trimmed, type).subscribe((column) => {
      this.columns.update((columns) => [...columns, column]);
    });
  }

  renameColumn(column: DatasetColumn, name: string): void {
    const id = this.selectedId();
    if (!id || !name.trim() || name === column.name) return;
    this.api.updateColumn(id, column.id, name.trim(), column.type).subscribe((updated) => {
      this.columns.update((columns) => columns.map((c) => (c.id === updated.id ? updated : c)));
    });
  }

  retypeColumn(column: DatasetColumn, type: DatasetColumnType): void {
    const id = this.selectedId();
    if (!id || type === column.type) return;
    this.api.updateColumn(id, column.id, column.name, type).subscribe((updated) => {
      this.columns.update((columns) => columns.map((c) => (c.id === updated.id ? updated : c)));
    });
  }

  deleteColumn(column: DatasetColumn): void {
    const id = this.selectedId();
    if (!id) return;

    this.api.removeColumn(id, column.id).subscribe(() => {
      this.columns.update((columns) => columns.filter((c) => c.id !== column.id));
      // The server strips the value too, so mirror that locally.
      this.rows.update((rows) =>
        rows.map((row) => {
          const { [column.id]: _removed, ...rest } = row.values;
          return { ...row, values: rest };
        }),
      );
    });
  }

  moveColumn(index: number, offset: number): void {
    const id = this.selectedId();
    const columns = [...this.columns()];
    const target = index + offset;
    if (!id || target < 0 || target >= columns.length) return;

    [columns[index], columns[target]] = [columns[target], columns[index]];
    this.columns.set(columns);
    this.api
      .reorderColumns(
        id,
        columns.map((c) => c.id),
      )
      .subscribe((schema) => {
        this.columns.set(schema.columns);
      });
  }

  // --- rows -----------------------------------------------------------------

  addRow(): void {
    const id = this.selectedId();
    if (!id) return;
    this.api.addRow(id, {}).subscribe((row) => this.rows.update((rows) => [...rows, row]));
  }

  setCell(row: DatasetRow, columnId: string, value: string): void {
    const id = this.selectedId();
    if (!id) return;

    const values = { ...row.values, [columnId]: value };
    // Show the edit straight away; the server response then confirms it.
    this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, values } : r)));
    this.api.updateRow(id, row.id, values).subscribe((updated) => {
      this.rows.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
    });
  }

  deleteRow(row: DatasetRow): void {
    const id = this.selectedId();
    if (!id) return;
    this.api.removeRow(id, row.id).subscribe(() => {
      this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
    });
  }
}

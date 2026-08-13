import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import {
  DatasetColumn,
  DatasetColumnType,
  DatasetData,
  DatasetRow,
  DatasetSchema,
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

  private readonly datasetsResource = httpResource<DatasetSummary[]>(() => '/api/datasets', {
    defaultValue: [],
  });
  readonly datasets = this.datasetsResource.value;

  readonly selectedId = signal<string | null>(null);

  readonly selected = computed(
    () => this.datasets().find((d) => d.id === this.selectedId()) ?? null,
  );

  // The selected dataset's schema and rows refetch automatically whenever the selection changes.
  private readonly schemaResource = httpResource<DatasetSchema>(() =>
    this.selectedId() ? `/api/datasets/${this.selectedId()}/schema` : undefined,
  );
  private readonly dataResource = httpResource<DatasetData>(() =>
    this.selectedId() ? `/api/datasets/${this.selectedId()}/data` : undefined,
  );

  // Seeded from the server but locally writable, so edits appear immediately and reset to the
  // server's copy when the selection reloads. hasValue() guards the read — value() throws while a
  // resource is loading or errored.
  readonly columns = linkedSignal(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().columns : [],
  );
  readonly rows = linkedSignal(() =>
    this.dataResource.hasValue() ? this.dataResource.value().rows : [],
  );

  readonly loading = computed(
    () => this.schemaResource.isLoading() || this.dataResource.isLoading(),
  );
  readonly error = computed(() => {
    if (this.datasetsResource.error()) return 'Could not load datasets.';
    if (this.schemaResource.error() || this.dataResource.error()) return 'Could not load that dataset.';
    return null;
  });

  constructor() {
    // Default to the first dataset once the list arrives; never override a live selection.
    effect(() => {
      const list = this.datasets();
      untracked(() => {
        if (this.selectedId() === null && list.length) this.selectedId.set(list[0].id);
      });
    });
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  // --- datasets -------------------------------------------------------------

  createDataset(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.api.create(trimmed).subscribe((dataset) => {
      this.selectedId.set(dataset.id);
      this.datasetsResource.reload();
    });
  }

  renameDataset(name: string): void {
    const id = this.selectedId();
    if (!id || !name.trim()) return;
    this.api.rename(id, name.trim()).subscribe(() => this.datasetsResource.reload());
  }

  deleteDataset(): void {
    const id = this.selectedId();
    if (!id) return;

    this.api.remove(id).subscribe(() => {
      this.selectedId.set(null);
      this.datasetsResource.reload();
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

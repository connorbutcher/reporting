import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { forkJoin } from 'rxjs';
import { DatasetApiService } from '../../core/api/dataset-api.service';
import {
  DatasetColumn,
  DatasetColumnType,
  DatasetRow,
  DatasetSummary,
} from '../../core/models/dataset.model';

const COLUMN_TYPES: { label: string; value: DatasetColumnType }[] = [
  { label: 'Text', value: 'string' },
  { label: 'Whole number', value: 'int' },
  { label: 'Decimal', value: 'double' },
  { label: 'Yes / No', value: 'bool' },
  { label: 'Date', value: 'dateTime' },
];

@Component({
  selector: 'app-datasets-page',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, TableModule],
  templateUrl: './datasets-page.component.html',
  styleUrl: './datasets-page.component.scss',
})
export class DatasetsPageComponent implements OnInit {
  private readonly api = inject(DatasetApiService);

  protected readonly columnTypes = COLUMN_TYPES;

  protected readonly datasets = signal<DatasetSummary[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly columns = signal<DatasetColumn[]>([]);
  protected readonly rows = signal<DatasetRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly newDatasetName = signal('');
  protected readonly newColumnName = signal('');
  protected readonly newColumnType = signal<DatasetColumnType>('string');

  protected readonly selected = computed(
    () => this.datasets().find((d) => d.id === this.selectedId()) ?? null,
  );

  ngOnInit(): void {
    this.loadDatasets();
  }

  private loadDatasets(selectId?: string): void {
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

  protected select(id: string): void {
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

  protected createDataset(): void {
    const name = this.newDatasetName().trim();
    if (!name) return;

    this.api.create(name).subscribe((dataset) => {
      this.newDatasetName.set('');
      this.loadDatasets(dataset.id);
    });
  }

  protected renameDataset(name: string): void {
    const id = this.selectedId();
    if (!id || !name.trim()) return;
    this.api.rename(id, name.trim()).subscribe(() => this.loadDatasets(id));
  }

  protected deleteDataset(): void {
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

  protected addColumn(): void {
    const id = this.selectedId();
    const name = this.newColumnName().trim();
    if (!id || !name) return;

    this.api.addColumn(id, name, this.newColumnType()).subscribe((column) => {
      this.columns.update((columns) => [...columns, column]);
      this.newColumnName.set('');
    });
  }

  protected renameColumn(column: DatasetColumn, name: string): void {
    const id = this.selectedId();
    if (!id || !name.trim() || name === column.name) return;
    this.api.updateColumn(id, column.id, name.trim(), column.type).subscribe((updated) => {
      this.columns.update((columns) => columns.map((c) => (c.id === updated.id ? updated : c)));
    });
  }

  protected retypeColumn(column: DatasetColumn, type: DatasetColumnType): void {
    const id = this.selectedId();
    if (!id || type === column.type) return;
    this.api.updateColumn(id, column.id, column.name, type).subscribe((updated) => {
      this.columns.update((columns) => columns.map((c) => (c.id === updated.id ? updated : c)));
    });
  }

  protected deleteColumn(column: DatasetColumn): void {
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

  protected moveColumn(index: number, offset: number): void {
    const id = this.selectedId();
    const columns = [...this.columns()];
    const target = index + offset;
    if (!id || target < 0 || target >= columns.length) return;

    [columns[index], columns[target]] = [columns[target], columns[index]];
    this.columns.set(columns);
    this.api.reorderColumns(id, columns.map((c) => c.id)).subscribe((schema) => {
      this.columns.set(schema.columns);
    });
  }

  // --- rows -----------------------------------------------------------------

  protected addRow(): void {
    const id = this.selectedId();
    if (!id) return;
    this.api.addRow(id, {}).subscribe((row) => this.rows.update((rows) => [...rows, row]));
  }

  protected setCell(row: DatasetRow, columnId: string, value: string): void {
    const id = this.selectedId();
    if (!id) return;

    const values = { ...row.values, [columnId]: value };
    // Show the edit straight away; the server response then confirms it.
    this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, values } : r)));
    this.api.updateRow(id, row.id, values).subscribe((updated) => {
      this.rows.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
    });
  }

  protected deleteRow(row: DatasetRow): void {
    const id = this.selectedId();
    if (!id) return;
    this.api.removeRow(id, row.id).subscribe(() => {
      this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
    });
  }

  /** Native input type that best matches the column's stored type. */
  protected inputType(type: DatasetColumnType): string {
    switch (type) {
      case 'int':
      case 'double':
        return 'number';
      case 'dateTime':
        return 'date';
      default:
        return 'text';
    }
  }

  /** Dates round-trip as ISO strings but the date input wants yyyy-MM-dd. */
  protected cellValue(row: DatasetRow, column: DatasetColumn): string {
    const raw = row.values[column.id] ?? '';
    if (column.type !== 'dateTime' || !raw) return raw;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
  }

  protected isBool(column: DatasetColumn): boolean {
    return column.type === 'bool';
  }
}

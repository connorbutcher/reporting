import { Injectable, computed, inject, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetCollection } from './dataset-collection';
import { DatasetSchemaState } from './dataset-schema-state';

/**
 * Exports the selected dataset as a CSV of its raw stored values. The editor grid
 * only holds the row windows it has scrolled through, so this fetches the whole
 * dataset from the server, builds the file, and hands it to the browser to save.
 *
 * Pulled out of the rows panel so the component stays presentational: it owns the
 * server call, the {@link exporting} progress flag, and the success/failure toast,
 * rather than the component reaching for the API itself.
 */
@Injectable()
export class DatasetExport {
  private readonly api = inject(DatasetApiService);
  private readonly collection = inject(DatasetCollection);
  private readonly schema = inject(DatasetSchemaState);
  private readonly notify = inject(NotificationService);

  private readonly _exporting = signal(false);
  /** True while the whole dataset is being fetched and packaged, for the button's spinner. */
  readonly exporting = this._exporting.asReadonly();
  /** Nothing to export until the dataset has at least one column and is selected. */
  readonly canExport = computed(() => this.schema.columns().length > 0 && this.collection.selectedId() != null);

  exportCsv(): void {
    const id = this.collection.selectedId();
    const columns = this.schema.columns();
    if (id == null || columns.length === 0 || this._exporting()) return;

    this._exporting.set(true);
    this.api.getData(id).subscribe({
      next: (data) => {
        const header = columns.map((c) => this.csvCell(c.name));
        const body = data.rows.map((row) => columns.map((c) => this.csvCell(row.values[c.id] ?? '')));
        const csv = [header, ...body].map((cells) => cells.join(',')).join('\r\n');
        this.download(csv, this.fileName());
        this._exporting.set(false);
        this.notify.success(`Exported ${body.length} ${body.length === 1 ? 'row' : 'rows'}.`);
      },
      error: () => {
        this._exporting.set(false);
        this.notify.error("Couldn't export this dataset. Please try again.");
      },
    });
  }

  private download(csv: string, name: string): void {
    // A BOM keeps Excel from mangling non-ASCII characters.
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Quotes a value only when it contains a delimiter, quote or newline (RFC 4180). */
  private csvCell(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }

  private fileName(): string {
    const name = this.collection.selected()?.name ?? 'dataset';
    return name.replace(/[^\w.-]+/g, '_') || 'dataset';
  }
}

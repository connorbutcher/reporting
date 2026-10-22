import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetCollection } from './dataset-collection';
import { DatasetSchemaState } from './dataset-schema-state';

@Injectable()
export class DatasetExport {
  /** True while the whole dataset is being fetched and packaged, for the button's spinner. */
  public readonly exporting: Signal<boolean>;

  /** Nothing to export until the dataset has at least one column and is selected. */
  public readonly canExport = computed(
    () => this.schema.columns().length > 0 && this.collection.selectedId() != null,
  );

  private readonly api = inject(DatasetApiService);

  private readonly collection = inject(DatasetCollection);

  private readonly schema = inject(DatasetSchemaState);

  private readonly notify = inject(NotificationService);

  private readonly _exporting = signal(false);

  constructor() {
    this.exporting = this._exporting.asReadonly();
  }

  public exportCsv(): void {
    const id = this.collection.selectedId();
    const columns = this.schema.columns();
    if (id == null || columns.length === 0 || this._exporting()) {
      return;
    }

    this._exporting.set(true);
    this.api.getData(id).subscribe({
      next: (data) => {
        const header = columns.map((c) => this.csvCell(c.name));
        const body = data.rows.map((row) =>
          columns.map((c) => this.csvCell(row.values[c.id] ?? '')),
        );
        const csv = [header, ...body].map((cells) => cells.join(',')).join('\r\n');
        this.download(csv, this.fileName());
        this._exporting.set(false);
        this.notify.success(`Exported ${body.length} ${body.length === 1 ? 'row' : 'rows'}.`);
      },
      error: (err) => {
        this._exporting.set(false);
        this.notify.loadError(err, "Couldn't export this dataset. Please try again.");
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

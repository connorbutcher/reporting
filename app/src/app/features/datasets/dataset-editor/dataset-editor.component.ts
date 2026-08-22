import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatasetColumn, DatasetColumnType, DatasetRow } from '../../core/models/dataset.model';
import { DatasetsStore } from './datasets.store';

const COLUMN_TYPES: { label: string; value: DatasetColumnType }[] = [
  { label: 'Text', value: 'string' },
  { label: 'Whole number', value: 'int' },
  { label: 'Decimal', value: 'double' },
  { label: 'Yes / No', value: 'bool' },
  { label: 'Date', value: 'dateTime' },
];

/** Editor for the selected dataset: its name, columns, and row data. All state lives in {@link DatasetsStore}. */
@Component({
  selector: 'app-dataset-editor',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './dataset-editor.component.html',
  styleUrl: './dataset-editor.component.scss',
  host: { class: 'datasets__detail app-card' },
})
export class DatasetEditorComponent {
  protected readonly store = inject(DatasetsStore);

  protected readonly columnTypes = COLUMN_TYPES;
  protected readonly newColumnName = signal('');
  protected readonly newColumnType = signal<DatasetColumnType>('string');

  protected addColumn(): void {
    const name = this.newColumnName().trim();
    if (!name) return;
    this.store.addColumn(name, this.newColumnType());
    this.newColumnName.set('');
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

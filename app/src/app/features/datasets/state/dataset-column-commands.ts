import { Injectable, inject } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetColumn, DatasetColumnType } from '../../../core/models/dataset';
import { DatasetAutosave } from './dataset-autosave';
import { DatasetCollection } from './dataset-collection';
import { DatasetRowWindow } from './dataset-row-window';
import { DatasetSchemaState } from './dataset-schema-state';

/**
 * The selected dataset's column mutations — add, rename, retype, delete and
 * reorder — each persisting immediately and updating the editor's local
 * {@link DatasetSchemaState.columns} optimistically, rolling back on failure.
 */
@Injectable()
export class DatasetColumnCommands {
  private readonly api = inject(DatasetApiService);
  private readonly autosave = inject(DatasetAutosave);
  private readonly collection = inject(DatasetCollection);
  private readonly schema = inject(DatasetSchemaState);
  private readonly rows = inject(DatasetRowWindow);
  private readonly notify = inject(NotificationService);

  addColumn(name: string, type: DatasetColumnType): void {
    const id = this.collection.selectedId();
    const trimmed = name.trim();
    if (!id || !trimmed) return;

    this.autosave.track(this.api.addColumn(id, trimmed, type)).subscribe({
      next: (column) => this.schema.columns.update((columns) => [...columns, column]),
      error: () => this.notify.error(`Couldn't add the column "${trimmed}". Please try again.`),
    });
  }

  renameColumn(column: DatasetColumn, name: string): void {
    const id = this.collection.selectedId();
    if (!id || !name.trim() || name === column.name) return;
    this.autosave.track(this.api.updateColumn(id, column.id, name.trim(), column.type)).subscribe({
      next: (updated) =>
        this.schema.columns.update((columns) =>
          columns.map((c) => (c.id === updated.id ? updated : c)),
        ),
      error: () => this.notify.error("Couldn't rename the column. Please try again."),
    });
  }

  retypeColumn(column: DatasetColumn, type: DatasetColumnType): void {
    const id = this.collection.selectedId();
    if (!id || type === column.type) return;
    this.autosave.track(this.api.updateColumn(id, column.id, column.name, type)).subscribe({
      next: (updated) =>
        this.schema.columns.update((columns) =>
          columns.map((c) => (c.id === updated.id ? updated : c)),
        ),
      error: () => this.notify.error("Couldn't change the column type. Please try again."),
    });
  }

  deleteColumn(column: DatasetColumn): void {
    const id = this.collection.selectedId();
    if (!id) return;

    this.autosave.track(this.api.removeColumn(id, column.id)).subscribe({
      next: () => {
        this.schema.columns.update((columns) => columns.filter((c) => c.id !== column.id));
        // The server strips the value too, so mirror that on the loaded rows.
        this.rows.stripColumn(column.id);
      },
      error: () => this.notify.error(`Couldn't delete "${column.name}". Please try again.`),
    });
  }

  moveColumn(index: number, offset: number): void {
    const id = this.collection.selectedId();
    const previous = this.schema.columns();
    const columns = [...previous];
    const target = index + offset;
    if (!id || target < 0 || target >= columns.length) return;

    [columns[index], columns[target]] = [columns[target], columns[index]];
    this.schema.columns.set(columns);
    this.autosave
      .track(
        this.api.reorderColumns(
          id,
          columns.map((c) => c.id),
        ),
      )
      .subscribe({
        next: (schema) => this.schema.columns.set(schema.columns),
        error: () => {
          this.schema.columns.set(previous);
          this.notify.error("Couldn't reorder the columns — the change was reverted.");
        },
      });
  }
}

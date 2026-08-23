import { Injectable, inject } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetRow } from '../../../core/models/dataset.model';
import { DatasetAutosave } from './dataset-autosave';
import { DatasetCollection } from './dataset-collection';
import { DatasetRowWindow } from './dataset-row-window';

/**
 * The selected dataset's row mutations — add, edit a cell, delete — each
 * persisting immediately and updating the lazily-loaded {@link DatasetRowWindow}
 * optimistically, rolling back on failure.
 */
@Injectable()
export class DatasetRowCommands {
  private readonly api = inject(DatasetApiService);
  private readonly autosave = inject(DatasetAutosave);
  private readonly collection = inject(DatasetCollection);
  private readonly window = inject(DatasetRowWindow);
  private readonly notify = inject(NotificationService);

  addRow(): void {
    const id = this.collection.selectedId();
    if (!id) return;
    this.autosave.track(this.api.addRow(id, {})).subscribe({
      // The new row lands at the end; re-seat the grid onto the final window and
      // scroll it into view for editing.
      next: () => this.window.afterAdd(),
      error: () => this.notify.error("Couldn't add the row. Please try again."),
    });
  }

  setCell(row: DatasetRow, columnId: string, value: string): void {
    const id = this.collection.selectedId();
    if (!id) return;

    const values = { ...row.values, [columnId]: value };
    // Show the edit straight away; the server response then confirms it, or a
    // failure rolls this one row back to what it held before.
    this.window.replaceRow({ ...row, values });
    this.autosave.track(this.api.updateRow(id, row.id, values)).subscribe({
      next: (updated) => this.window.replaceRow(updated),
      error: () => {
        this.window.replaceRow(row);
        this.notify.error("That edit couldn't be saved — the cell was reverted.");
      },
    });
  }

  deleteRow(row: DatasetRow): void {
    const id = this.collection.selectedId();
    if (!id) return;
    this.autosave.track(this.api.removeRow(id, row.id)).subscribe({
      next: () => this.window.removeRow(row.id),
      error: () => this.notify.error("Couldn't delete the row. Please try again."),
    });
  }
}

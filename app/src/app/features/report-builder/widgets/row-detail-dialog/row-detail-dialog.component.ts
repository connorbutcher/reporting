import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { TableRowResult } from '../../../../core/models/widget-query';
import { RowDetailDialogData } from './row-detail-dialog-data';

/** Every column of one table row, fetched afresh with the full dataset column list. */
@Component({
  selector: 'app-row-detail-dialog',
  templateUrl: './row-detail-dialog.component.html',
  styleUrl: './row-detail-dialog.component.scss',
})
export class RowDetailDialogComponent {
  public readonly data = inject<RowDetailDialogData>(DIALOG_DATA);
  public readonly row = signal<TableRowResult | null>(null);
  public readonly loading = signal(true);
  public readonly error = signal(false);

  private readonly dialogRef = inject(DialogRef<void>);

  constructor() {
    inject(DatasetApiService)
      .queryTable(this.data.datasetId, {
        filter: null,
        sortColumnId: null,
        sortDirection: 'asc',
        skip: 0,
        take: 1,
        columns: this.data.fields.map((f) => f.setting),
        rowId: this.data.rowId,
      })
      .subscribe({
        next: (result) => {
          this.row.set(result.rows[0] ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  public toleranceLabel(status: string | undefined): string | null {
    switch (status) {
      case 'fail':
        return 'Out of tolerance';
      case 'concession':
        return 'Needs concession';
      default:
        return null;
    }
  }

  public close(): void {
    this.dialogRef.close();
  }
}

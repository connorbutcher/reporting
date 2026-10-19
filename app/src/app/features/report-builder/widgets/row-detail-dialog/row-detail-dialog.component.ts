import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DataTableColumnSetting } from '../../../../core/models/report';
import { TableRowResult } from '../../../../core/models/widget-query';

/** One field the row-detail panel lists: the column and the label to show it under. */
export interface RowDetailField {
  setting: DataTableColumnSetting;
  label: string;
}

/** What a table hands the row-detail panel: which row of which dataset, and the fields to list. */
export interface RowDetailDialogData {
  datasetId: number;
  rowId: string;
  title: string;
  /** Every dataset column, the table's own settings (header, tolerance) applied where it has them. */
  fields: RowDetailField[];
}

/**
 * A side panel listing every column of one table row, opened by clicking the row. It fetches the row
 * afresh with every dataset column, so it shows what the table's own (narrower) column list leaves out.
 */
@Component({
  selector: 'app-row-detail-dialog',
  templateUrl: './row-detail-dialog.component.html',
  styleUrl: './row-detail-dialog.component.scss',
})
export class RowDetailDialogComponent {
  protected readonly data = inject<RowDetailDialogData>(DIALOG_DATA);
  protected readonly row = signal<TableRowResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

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

  protected toleranceLabel(status: string | undefined): string | null {
    switch (status) {
      case 'fail':
        return 'Out of tolerance';
      case 'concession':
        return 'Needs concession';
      default:
        return null;
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }
}

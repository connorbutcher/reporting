import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn } from '../../../../core/models/dataset';
import { DEFAULT_TABLE_CONFIG, DataTableWidgetConfig } from '../../../../core/models/report';
import { DataTableWidgetComponent } from '../data-table-widget/data-table-widget.component';
import { WidgetExportActionsComponent } from '../widget-export-actions/widget-export-actions.component';
import { DrillThroughDialogData } from './drill-through-dialog-data';

/** The rows behind a drilled cell, shown with the data table widget configured on the fly. */
@Component({
  selector: 'app-drill-through-dialog',
  imports: [DataTableWidgetComponent, WidgetExportActionsComponent],
  templateUrl: './drill-through-dialog.component.html',
  styleUrl: './drill-through-dialog.component.scss',
})
export class DrillThroughDialogComponent {
  public readonly data = inject<DrillThroughDialogData>(DIALOG_DATA);
  public readonly table = viewChild(DataTableWidgetComponent);

  public readonly error = signal(false);

  public readonly config = computed<DataTableWidgetConfig | null>(() => {
    const columns = this.columns();
    if (!columns) {
      return null;
    }
    return {
      ...DEFAULT_TABLE_CONFIG,
      type: 'dataTable',
      title: this.data.title,
      datasetId: this.data.datasetId,
      showSearch: true,
      stripedRows: true,
      columns: columns.map((c) => ({ columnId: c.id })),
    };
  });

  private readonly columns = signal<DatasetColumn[] | null>(null);

  private readonly dialogRef = inject(DialogRef<void>);

  constructor() {
    inject(DatasetApiService)
      .getSchema(this.data.datasetId)
      .subscribe({
        next: (schema) => this.columns.set(schema.columns),
        error: () => this.error.set(true),
      });
  }

  public close(): void {
    this.dialogRef.close();
  }
}

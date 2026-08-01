import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetColumn, DatasetData, DatasetRow } from '../../../../core/models/dataset.model';

@Component({
  selector: 'app-data-table-widget',
  imports: [],
  templateUrl: './data-table-widget.component.html',
  styleUrl: './data-table-widget.component.scss',
})
export class DataTableWidgetComponent {
  readonly datasetId = input.required<string>();

  private readonly datasetApi = inject(DatasetApiService);

  protected readonly columns = signal<DatasetColumn[]>([]);
  protected readonly data = signal<DatasetData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly rows = computed(() => this.data()?.rows ?? []);

  constructor() {
    effect((onCleanup) => {
      const datasetId = this.datasetId();
      this.loading.set(true);
      this.error.set(false);

      // Schema and row data are separate endpoints: columns describe the table,
      // rows carry the values keyed by column id.
      const subscription = forkJoin({
        schema: this.datasetApi.getSchema(datasetId),
        data: this.datasetApi.getData(datasetId),
      }).subscribe({
        next: ({ schema, data }) => {
          this.columns.set(schema.columns);
          this.data.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected valueFor(row: DatasetRow, column: DatasetColumn): string {
    const raw = row.values[column.id];
    if (raw === undefined || raw === null || raw === '') return '';

    switch (column.type) {
      case 'bool':
        return raw.toLowerCase() === 'true' ? 'Yes' : 'No';
      case 'dateTime': {
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString();
      }
      default:
        return raw;
    }
  }
}

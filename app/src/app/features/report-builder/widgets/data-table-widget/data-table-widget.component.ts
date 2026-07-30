import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetData, DatasetRecord } from '../../../../core/models/dataset.model';

@Component({
  selector: 'app-data-table-widget',
  imports: [],
  templateUrl: './data-table-widget.component.html',
  styleUrl: './data-table-widget.component.scss',
})
export class DataTableWidgetComponent {
  readonly datasetId = input.required<string>();

  private readonly datasetApi = inject(DatasetApiService);

  protected readonly dataset = signal<DatasetData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly columns = computed(() => {
    const dataset = this.dataset();
    if (!dataset) return [];

    const seen = new Set<string>();
    const columns: string[] = [];
    for (const record of dataset.records) {
      for (const field of record.fields) {
        if (!seen.has(field.displayName)) {
          seen.add(field.displayName);
          columns.push(field.displayName);
        }
      }
    }
    return columns;
  });

  constructor() {
    effect((onCleanup) => {
      const datasetId = this.datasetId();
      this.loading.set(true);
      this.error.set(false);

      const subscription = this.datasetApi.getData(datasetId).subscribe({
        next: (data) => {
          this.dataset.set(data);
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

  protected valueFor(record: DatasetRecord, displayName: string): string {
    const field = record.fields.find((f) => f.displayName === displayName);
    if (!field || field.value === null || field.value === undefined) return '';
    if (field.dataType === 'bool') return field.value ? 'Yes' : 'No';
    if (field.dataType === 'dateTime') return new Date(field.value as string).toLocaleDateString();
    return String(field.value);
  }
}

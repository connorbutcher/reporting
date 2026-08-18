import { inject, Service, signal } from '@angular/core';
import { DatasetApiService } from '../api/dataset-api.service';
import { DatasetColumnConfiguration, DatasetSchema } from '../models/dataset.model';

/**
 * Dataset schemas fetched by the report builder, cached for the rest of the
 * session so panel interactions and every widget referencing a dataset never
 * refetch it.
 */
@Service()
export class DatasetSchemaCacheService {
  private readonly datasetApi = inject(DatasetApiService);

  private readonly cache = signal<Record<number, DatasetSchema>>({});
  private readonly inFlight = new Set<number>();

  readonly schemas = this.cache.asReadonly();

  /** Fetches a dataset's schema once; later calls for the same id are no-ops. */
  ensure(datasetId: number): void {
    if (this.cache()[datasetId] || this.inFlight.has(datasetId)) return;

    this.inFlight.add(datasetId);
    this.datasetApi.getSchema(datasetId).subscribe({
      next: (schema) => this.cache.update((all) => ({ ...all, [datasetId]: schema })),
      complete: () => this.inFlight.delete(datasetId),
      error: () => this.inFlight.delete(datasetId),
    });
  }

  /**
   * Patches a cached column's configuration immediately so open panels reflect
   * the change, then reconciles with whatever the server actually stored.
   */
  updateColumnConfiguration(
    datasetId: number,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): void {
    this.patchColumn(datasetId, columnId, configuration);

    this.datasetApi.updateColumnConfiguration(datasetId, columnId, configuration).subscribe((column) => {
      this.patchColumn(datasetId, columnId, column.configuration ?? {});
    });
  }

  private patchColumn(datasetId: number, columnId: string, configuration: DatasetColumnConfiguration): void {
    this.cache.update((all) => {
      const schema = all[datasetId];
      if (!schema) return all;
      return {
        ...all,
        [datasetId]: {
          ...schema,
          columns: schema.columns.map((c) => (c.id === columnId ? { ...c, configuration } : c)),
        },
      };
    });
  }
}

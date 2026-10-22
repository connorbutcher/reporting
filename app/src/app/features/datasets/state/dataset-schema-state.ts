import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { DatasetSchema, DatasetSourceConfig, DatasetSourceKey } from '../../../core/models/dataset';
import { DatasetCollection } from './dataset-collection';

@Injectable()
export class DatasetSchemaState {
  // Locally writable so edits show at once; reset when the selection reloads.
  public readonly columns = linkedSignal(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().columns : [],
  );

  // Locally writable so repointing the source shows at once.
  public readonly source = linkedSignal<DatasetSourceKey | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().source : null,
  );

  public readonly sourceId = linkedSignal<number | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().sourceId : null,
  );

  public readonly sourceConfig = linkedSignal<DatasetSourceConfig | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().sourceConfig : null,
  );

  /** True for a filtered view, whose columns and rows are read-only. */
  public readonly isFiltered = computed(() => this.source() === 'filtered');

  public readonly error = computed(() =>
    this.schemaResource.error()
      ? "This dataset couldn't be loaded — it may have been deleted, or you may not have access to it."
      : null,
  );

  private readonly collection = inject(DatasetCollection);

  private readonly schemaResource = httpResource<DatasetSchema>(() =>
    this.collection.selectedId()
      ? `/api/datasets/${this.collection.selectedId()}/schema`
      : undefined,
  );

  /** For server-side column changes, such as a formula recalculating. */
  public reload(): void {
    this.schemaResource.reload();
  }

  public get schemaLoading() {
    return this.schemaResource.isLoading;
  }
}

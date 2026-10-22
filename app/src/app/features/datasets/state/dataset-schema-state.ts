import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { DatasetSchema, DatasetSourceConfig, DatasetSourceKey } from '../../../core/models/dataset';
import { DatasetCollection } from './dataset-collection';

@Injectable()
export class DatasetSchemaState {
  // Seeded from the server but locally writable, so edits appear immediately and reset to the
  // server's copy when the selection reloads. hasValue() guards the read — value() throws while a
  // resource is loading or errored.
  public readonly columns = linkedSignal(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().columns : [],
  );

  // Seeded from the server but locally writable, so repointing the source shows at once (see
  // DatasetSourceCommands.setSource) instead of blanking the editor on a schema reload; reset to
  // the server's copy when the selection reloads.
  /** The selected dataset's source, or null while its schema loads. */
  public readonly source = linkedSignal<DatasetSourceKey | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().source : null,
  );

  /** The selected dataset's source id, or null while its schema loads. */
  public readonly sourceId = linkedSignal<number | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().sourceId : null,
  );

  /** The selected dataset's source config; locally writable so edits show at once. */
  public readonly sourceConfig = linkedSignal<DatasetSourceConfig | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().sourceConfig : null,
  );

  /**
   * True when the selected dataset is a filtered view over another dataset — its columns and rows
   * are inherited/computed, not its own, so the editor's columns and rows panels show them read-only.
   */
  public readonly isFiltered = computed(() => this.source() === 'filtered');

  /** A failure loading the selected dataset's schema, shown in the editor. */
  public readonly error = computed(() =>
    this.schemaResource.error()
      ? "This dataset couldn't be loaded — it may have been deleted, or you may not have access to it."
      : null,
  );

  private readonly collection = inject(DatasetCollection);

  // The selected dataset's schema refetches automatically whenever the selection changes.
  private readonly schemaResource = httpResource<DatasetSchema>(() =>
    this.collection.selectedId()
      ? `/api/datasets/${this.collection.selectedId()}/schema`
      : undefined,
  );

  /** Fetches the schema again — for after a change that alters columns the client did not edit itself (a formula recalculating). */
  public reload(): void {
    this.schemaResource.reload();
  }

  /** True while the selected dataset's schema is loading, for the columns skeleton. */
  public get schemaLoading() {
    return this.schemaResource.isLoading;
  }
}

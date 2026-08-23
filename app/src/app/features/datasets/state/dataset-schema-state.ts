import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import {
  DatasetSchema,
  DatasetSourceConfig,
  DatasetSourceKey,
} from '../../../core/models/dataset';
import { DatasetCollection } from './dataset-collection';

/**
 * The selected dataset's schema — its columns and source — refetched whenever the
 * selection changes, held as locally writable copies the editor binds to. Seeding
 * from the server but writing locally lets edits appear immediately and lets a
 * source change reseat the editor without a reload flash. (The rows are loaded
 * separately and lazily; see {@link DatasetRowWindow}.)
 *
 * The command collaborators ({@link DatasetColumnCommands} and
 * {@link DatasetSourceCommands}) inject this to read and mutate the editable
 * signals; the resource keys off {@link DatasetCollection.selectedId}.
 */
@Injectable()
export class DatasetSchemaState {
  private readonly collection = inject(DatasetCollection);

  // The selected dataset's schema refetches automatically whenever the selection changes.
  private readonly schemaResource = httpResource<DatasetSchema>(() =>
    this.collection.selectedId() ? `/api/datasets/${this.collection.selectedId()}/schema` : undefined,
  );

  // Seeded from the server but locally writable, so edits appear immediately and reset to the
  // server's copy when the selection reloads. hasValue() guards the read — value() throws while a
  // resource is loading or errored.
  readonly columns = linkedSignal(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().columns : [],
  );

  // Seeded from the server but locally writable, so repointing the source shows at once (see
  // DatasetSourceCommands.setSource) instead of blanking the editor on a schema reload; reset to
  // the server's copy when the selection reloads.
  /** The selected dataset's source, or null while its schema loads. */
  readonly source = linkedSignal<DatasetSourceKey | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().source : null,
  );
  /** The selected dataset's source id, or null while its schema loads. */
  readonly sourceId = linkedSignal<number | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().sourceId : null,
  );
  /** The selected dataset's source config; locally writable so edits show at once. */
  readonly sourceConfig = linkedSignal<DatasetSourceConfig | null>(() =>
    this.schemaResource.hasValue() ? this.schemaResource.value().sourceConfig : null,
  );

  /** True while the selected dataset's schema is loading, for the columns skeleton. */
  readonly schemaLoading = this.schemaResource.isLoading;

  /** A failure loading the selected dataset's schema, shown in the editor. */
  readonly error = computed(() =>
    this.schemaResource.error()
      ? "This dataset couldn't be loaded — it may have been deleted, or you may not have access to it."
      : null,
  );
}

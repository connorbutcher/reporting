import { Injectable, inject } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { DatasetSourceConfig } from '../../../core/models/dataset.model';
import { DatasetAutosave } from './dataset-autosave';
import { DatasetCollection } from './dataset-collection';
import { DatasetSchemaState } from './dataset-schema-state';

/**
 * The selected dataset's source system and its configuration — repointing the
 * source, and editing the source-specific config. Both persist immediately and
 * seed the editor's local {@link DatasetSchemaState} from the response.
 */
@Injectable()
export class DatasetSourceCommands {
  private readonly api = inject(DatasetApiService);
  private readonly autosave = inject(DatasetAutosave);
  private readonly collection = inject(DatasetCollection);
  private readonly schema = inject(DatasetSchemaState);

  /** Repoints the selected dataset at a different source; its config resets server-side. */
  setSource(sourceId: number): void {
    const id = this.collection.selectedId();
    if (!id || !sourceId || sourceId === this.schema.sourceId()) return;
    this.autosave.track(this.api.setSource(id, sourceId)).subscribe({
      next: (schema) => {
        // The PUT returns the fresh schema, so seed the editor's local state from it instead of
        // reloading the schema resource — a reload would blank every panel at once (a full-editor
        // flash) since they all derive from it. Only the list needs a reload, for its source chip.
        this.schema.source.set(schema.source);
        this.schema.sourceId.set(schema.sourceId);
        this.schema.sourceConfig.set(schema.sourceConfig);
        this.schema.columns.set(schema.columns);
        this.collection.reloadList();
      },
      error: () => {},
    });
  }

  /** Replaces the selected dataset's source config, showing the edit immediately. */
  updateSourceConfig(config: DatasetSourceConfig): void {
    const id = this.collection.selectedId();
    if (!id) return;
    const previous = this.schema.sourceConfig();
    this.schema.sourceConfig.set(config);
    this.autosave.track(this.api.updateSourceConfig(id, config)).subscribe({
      next: (schema) => this.schema.sourceConfig.set(schema.sourceConfig),
      error: () => this.schema.sourceConfig.set(previous),
    });
  }
}

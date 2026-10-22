import { Injectable, inject } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetSourceConfig } from '../../../core/models/dataset';
import { DatasetAutosave } from './dataset-autosave';
import { DatasetCollection } from './dataset-collection';
import { DatasetRowWindow } from './dataset-row-window';
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
  private readonly rowWindow = inject(DatasetRowWindow);
  private readonly notify = inject(NotificationService);

  /** Repoints the selected dataset at a different source; its config resets server-side. */
  public setSource(sourceId: number): void {
    const id = this.collection.selectedId();
    if (!id || !sourceId || sourceId === this.schema.sourceId()) {
      return;
    }
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
        // A different source means different rows (a fresh source starts empty; a filtered
        // one narrows a different base) — the row window otherwise keeps showing the old source's.
        this.rowWindow.reload();
      },
      error: (err) => this.notify.apiError(err, "Couldn't change the source. Please try again."),
    });
  }

  /** Replaces the selected dataset's source config, showing the edit immediately. */
  public updateSourceConfig(config: DatasetSourceConfig): void {
    const id = this.collection.selectedId();
    if (!id) {
      return;
    }
    const previous = this.schema.sourceConfig();
    this.schema.sourceConfig.set(config);
    this.autosave.track(this.api.updateSourceConfig(id, config)).subscribe({
      next: (schema) => {
        this.schema.sourceConfig.set(schema.sourceConfig);
        // A filtered dataset's rows are exactly whatever this config's filter now matches — the
        // row window otherwise keeps showing the window it loaded before this edit.
        this.rowWindow.reload();
      },
      error: (err) => {
        this.schema.sourceConfig.set(previous);
        this.notify.apiError(
          err,
          "Couldn't save the source configuration — the change was reverted.",
        );
      },
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetSourceConfig } from '../../../core/models/dataset';
import { DatasetAutosave } from './dataset-autosave';
import { DatasetCollection } from './dataset-collection';
import { DatasetRowWindow } from './dataset-row-window';
import { DatasetSchemaState } from './dataset-schema-state';

/** Source and source config edits, seeding {@link DatasetSchemaState} from the response. */
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
        // Seeds from the response instead of reloading, which would blank every panel.
        this.schema.source.set(schema.source);
        this.schema.sourceId.set(schema.sourceId);
        this.schema.sourceConfig.set(schema.sourceConfig);
        this.schema.columns.set(schema.columns);
        this.collection.reloadList();
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

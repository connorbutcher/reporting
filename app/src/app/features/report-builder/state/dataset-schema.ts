import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DatasetColumnConfiguration } from '../../../core/models/dataset';
import { DatasetSchemaCacheService } from '../../../core/services/dataset-schema-cache.service';
import { ChartWidgetModel, DataTableWidgetModel } from '../models/widget.model';
import { ReportSession } from './report-session';

/**
 * The report's relationship to the dataset schemas its widgets draw on: making
 * sure every referenced schema is loaded, exposing the selected table's columns,
 * and funnelling column-configuration edits back through the shared cache.
 */
@Injectable()
export class DatasetSchema {
  private readonly schemaCache = inject(DatasetSchemaCacheService);
  private readonly session = inject(ReportSession);

  /** Bumped when a column's configuration changes, so widgets re-read it. */
  readonly datasetVersion = signal(0);

  /** Columns of the selected table's dataset, or empty until they arrive. */
  readonly activeSchemaColumns = computed(
    () => this.session.selectedTableWidget()?.schema()?.columns ?? [],
  );

  /** A table needs a dataset before columns can be chosen. */
  readonly hasDataset = computed(() => !!this.session.selectedTableWidget()?.datasetId());

  constructor() {
    // Every referenced dataset is needed, not just the selected one, so column
    // validation can tell a missing column from a schema that hasn't loaded.
    effect(() => {
      for (const widget of this.session.widgets()) {
        if (widget instanceof DataTableWidgetModel) {
          const datasetId = widget.datasetId();
          if (datasetId) this.schemaCache.ensure(datasetId);
        } else if (widget instanceof ChartWidgetModel) {
          // A chart can overlay several datasets — one per binding — so every
          // bound binding's schema is needed, not just the first.
          for (const binding of widget.bindings()) {
            const datasetId = binding.datasetId();
            if (datasetId) this.schemaCache.ensure(datasetId);
          }
        }
      }
    });
  }

  updateColumnConfiguration(
    datasetId: number,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): void {
    this.schemaCache.updateColumnConfiguration(datasetId, columnId, configuration);
    this.datasetVersion.update((v) => v + 1);
  }
}

import { Injector, Signal, computed, effect, signal } from '@angular/core';
import { DatasetColumnConfiguration } from '../../../core/models/dataset';
import { DatasetSchemaCacheService } from '../../../core/services/dataset-schema-cache.service';
import { ChartWidgetModel, DataTableWidgetModel, WidgetModel } from '../models/widget.model';

/**
 * The report's relationship to the dataset schemas its widgets draw on: making
 * sure every referenced schema is loaded, exposing the selected table's columns,
 * and funnelling column-configuration edits back through the shared cache.
 */
export class DatasetSchema {
  /** Bumped when a column's configuration changes, so widgets re-read it. */
  readonly datasetVersion = signal(0);

  /** Columns of the selected table's dataset, or empty until they arrive. */
  readonly activeSchemaColumns = computed(() => this.selectedTableWidget()?.schema()?.columns ?? []);

  /** A table needs a dataset before columns can be chosen. */
  readonly hasDataset = computed(() => !!this.selectedTableWidget()?.datasetId());

  constructor(
    private readonly schemaCache: DatasetSchemaCacheService,
    private readonly selectedTableWidget: Signal<DataTableWidgetModel | null>,
    private readonly widgets: Signal<readonly WidgetModel[]>,
    injector: Injector,
  ) {
    // Every referenced dataset is needed, not just the selected one, so column
    // validation can tell a missing column from a schema that hasn't loaded.
    effect(
      () => {
        for (const widget of this.widgets()) {
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
      },
      { injector },
    );
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

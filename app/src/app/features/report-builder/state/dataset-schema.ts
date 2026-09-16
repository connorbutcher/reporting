import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DatasetColumnConfiguration } from '../../../core/models/dataset';
import { DatasetSchemaCacheService } from '../../../core/services/dataset-schema-cache.service';
import { ChartWidgetModel, DataTableWidgetModel, PivotTableWidgetModel } from '../models/widget.model';
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
    // This also covers every tolerance pointer's *own* limits dataset — separate
    // from whatever the widget itself plots — so a table column's or chart band's
    // tolerance columns can be checked the same way; see ChartWidgetModel/
    // TableColumnModel's dangling-column validation.
    effect(() => {
      for (const widget of this.session.widgets()) {
        if (widget instanceof DataTableWidgetModel) {
          const datasetId = widget.datasetId();
          if (datasetId) this.schemaCache.ensure(datasetId);
          for (const column of widget.columns()) {
            const toleranceSourceId = column.tolerance()?.sourceDatasetId;
            if (toleranceSourceId) this.schemaCache.ensure(toleranceSourceId);
          }
        } else if (widget instanceof ChartWidgetModel) {
          // A chart can overlay several datasets — one per binding — so every
          // bound binding's schema is needed, not just the first.
          for (const binding of widget.bindings()) {
            const datasetId = binding.datasetId();
            if (datasetId) this.schemaCache.ensure(datasetId);
          }
          for (const band of widget.toleranceBands()) {
            if (band.sourceDatasetId) this.schemaCache.ensure(band.sourceDatasetId);
          }
        } else if (widget instanceof PivotTableWidgetModel) {
          // Previously missing entirely: a pivot's own dataset was never explicitly
          // fetched, so its schema (and therefore its column pickers and validation)
          // only ever worked by accident, when some other widget on the report
          // happened to already be using the same dataset.
          const datasetId = widget.datasetId();
          if (datasetId) this.schemaCache.ensure(datasetId);
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

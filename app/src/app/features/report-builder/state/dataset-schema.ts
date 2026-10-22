import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DatasetColumnConfiguration } from '../../../core/models/dataset';
import { DatasetSchemaCacheService } from '../../../core/services/dataset-schema-cache.service';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  KpiWidgetModel,
  PivotTableWidgetModel,
} from '../models/widget.model';
import { ReportSession } from './report-session';

/** Loads every schema the report's widgets use and routes column-configuration edits through the shared cache. */
@Injectable()
export class DatasetSchema {
  /** Bumped when a column's configuration changes, so widgets re-read it. */
  public readonly datasetVersion = signal(0);

  /** Empty until the selected table's schema arrives. */
  public readonly activeSchemaColumns = computed(
    () => this.session.selectedTableWidget()?.schema()?.columns ?? [],
  );

  public readonly hasDataset = computed(() => !!this.session.selectedTableWidget()?.datasetId());

  private readonly schemaCache = inject(DatasetSchemaCacheService);
  private readonly session = inject(ReportSession);

  constructor() {
    // Load every referenced dataset, including each tolerance's limits dataset, so validation can tell
    // a removed column from a schema that hasn't loaded.
    effect(() => {
      for (const widget of this.session.widgets()) {
        if (widget instanceof DataTableWidgetModel) {
          const datasetId = widget.datasetId();
          if (datasetId) {
            this.schemaCache.ensure(datasetId);
          }
          for (const column of widget.columns()) {
            const toleranceSourceId = column.tolerance()?.sourceDatasetId;
            if (toleranceSourceId) {
              this.schemaCache.ensure(toleranceSourceId);
            }
          }
        } else if (widget instanceof ChartWidgetModel) {
          // A chart overlays one dataset per binding.
          for (const binding of widget.bindings()) {
            const datasetId = binding.datasetId();
            if (datasetId) {
              this.schemaCache.ensure(datasetId);
            }
          }
          for (const band of widget.toleranceBands()) {
            if (band.sourceDatasetId) {
              this.schemaCache.ensure(band.sourceDatasetId);
            }
          }
        } else if (widget instanceof PivotTableWidgetModel) {
          const datasetId = widget.datasetId();
          if (datasetId) {
            this.schemaCache.ensure(datasetId);
          }
        } else if (widget instanceof KpiWidgetModel) {
          const datasetId = widget.datasetId();
          if (datasetId) {
            this.schemaCache.ensure(datasetId);
          }
          const toleranceSourceId = widget.tolerance()?.sourceDatasetId;
          if (toleranceSourceId) {
            this.schemaCache.ensure(toleranceSourceId);
          }
        }
      }
    });
  }

  public updateColumnConfiguration(
    datasetId: number,
    columnId: string,
    configuration: DatasetColumnConfiguration,
  ): void {
    this.schemaCache.updateColumnConfiguration(datasetId, columnId, configuration);
    this.datasetVersion.update((v) => v + 1);
  }
}

import { Injectable, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { FilterApiService } from '../../../core/api/filter-api.service';
import { DatasetSchema } from '../../../core/models/dataset';
import { OperatorCatalogue } from '../../../core/models/filter';
import { ReportRevisionContent, readChartBindings } from '../../../core/models/report';
import { isChartWidget } from '../../../core/models/widget-catalog';

/** The dataset schemas and operator catalogue the filter panel needs to describe columns. */
@Injectable()
export class ViewFilterSchemas {
  public readonly schemas: Signal<Record<number, DatasetSchema>>;
  public readonly catalogue: Signal<OperatorCatalogue | null>;

  private readonly datasetApi = inject(DatasetApiService);
  private readonly loaded = signal<Record<number, DatasetSchema>>({});
  private readonly operators = signal<OperatorCatalogue | null>(null);
  private readonly requested = new Set<number>();

  constructor() {
    this.schemas = this.loaded.asReadonly();
    this.catalogue = this.operators.asReadonly();
    inject(FilterApiService)
      .operators()
      .pipe(takeUntilDestroyed())
      .subscribe((catalogue) => this.operators.set(catalogue));
  }

  /** Fetches the schema of each dataset a version's filterable widgets use, once each. */
  public load(content: ReportRevisionContent): void {
    for (const datasetId of filterableDatasetIds(content)) {
      if (this.requested.has(datasetId)) continue;
      this.requested.add(datasetId);
      this.datasetApi.getSchema(datasetId).subscribe((schema) => {
        this.loaded.update((all) => ({ ...all, [datasetId]: schema }));
      });
    }
  }
}

function filterableDatasetIds(content: ReportRevisionContent): Set<number> {
  const ids = new Set<number>();
  for (const widget of content.tabs.flatMap((tab) => tab.widgets)) {
    if (widget.type === 'dataTable') {
      if (widget.config.datasetId) ids.add(widget.config.datasetId);
    } else if (isChartWidget(widget)) {
      for (const binding of readChartBindings(widget.config)) {
        if (binding.datasetId) ids.add(binding.datasetId);
      }
    }
  }
  return ids;
}

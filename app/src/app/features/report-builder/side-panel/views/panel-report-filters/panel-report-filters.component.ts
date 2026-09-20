import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ReportSession } from '../../../state/report-session';
import { FilterBuilderComponent } from '../../filter-builder/filter-builder.component';
import { PanelFilterReuseComponent } from '../panel-filter-reuse/panel-filter-reuse.component';

interface DatasetChip {
  readonly id: number;
  readonly name: string;
  readonly count: number;
  /** The chip's accessible name: dataset and conditions. */
  readonly label: string;
}

/** Report-level filters, one per dataset, applied to every widget bound to that dataset. */
@Component({
  selector: 'app-panel-report-filters',
  imports: [FilterBuilderComponent, PanelFilterReuseComponent],
  templateUrl: './panel-report-filters.component.html',
  styleUrl: './panel-report-filters.component.scss',
})
export class PanelReportFiltersComponent {
  public static readonly title = 'Report filters';

  public readonly datasetIds = computed(() => this.session.model()?.usedDatasetIds() ?? []);

  /** The dataset on screen; defaults to the first in use. */
  public readonly activeDatasetId = computed(
    () => this.selectedDatasetId() ?? this.datasetIds()[0] ?? null,
  );

  public readonly activeFilter = computed(() => {
    const datasetId = this.activeDatasetId();
    const model = this.session.model();
    return datasetId && model ? model.reportFilter(datasetId) : null;
  });

  public readonly chips = computed<DatasetChip[]>(() => {
    const model = this.session.model();
    const datasets = this.session.datasets();
    return this.datasetIds().map((id) => {
      const name = datasets.find((d) => d.id === id)?.name ?? 'Dataset';
      const count = model?.reportFilter(id)?.group.count() ?? 0;
      const conditions = count === 0 ? 'no conditions' : `${count} condition${count > 1 ? 's' : ''}`;
      return { id, name, count, label: `${name}, ${conditions}` };
    });
  });

  private readonly session = inject(ReportSession);
  private readonly selectedDatasetId = signal<number | null>(null);

  constructor() {
    // Creating the filter is a write, so it happens here rather than in a computed.
    effect(() => {
      const datasetId = this.activeDatasetId();
      const model = this.session.model();
      if (!datasetId || !model) return;
      untracked(() => model.ensureReportFilter(datasetId));
    });
  }

  public select(datasetId: number): void {
    this.selectedDatasetId.set(datasetId);
  }
}

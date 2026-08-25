import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ReportSession } from '../../../state/report-session';
import { FilterBuilderComponent } from '../../filter-builder/filter-builder.component';

/**
 * Report-level filters, scoped per dataset. Each one applies to every table on
 * the report bound to that dataset, on top of the table's own filter.
 */
@Component({
  selector: 'app-panel-report-filters',
  imports: [FilterBuilderComponent],
  templateUrl: './panel-report-filters.component.html',
  styleUrl: './panel-report-filters.component.scss',
})
export class PanelReportFiltersComponent {
  static readonly title = 'Report filters';

  private readonly session = inject(ReportSession);

  protected readonly datasetIds = computed(() => this.session.model()?.usedDatasetIds() ?? []);

  /** Which dataset's filter is on screen; defaults to the first one in use. */
  private readonly selectedDatasetId = signal<number | null>(null);
  protected readonly activeDatasetId = computed(
    () => this.selectedDatasetId() ?? this.datasetIds()[0] ?? null,
  );

  protected readonly activeFilter = computed(() => {
    const datasetId = this.activeDatasetId();
    const model = this.session.model();
    return datasetId && model ? model.reportFilter(datasetId) : null;
  });

  constructor() {
    // Creating the filter is a write, so it happens here rather than inside the
    // computed above — the panel always needs one to bind to.
    effect(() => {
      const datasetId = this.activeDatasetId();
      const model = this.session.model();
      if (!datasetId || !model) return;
      untracked(() => model.ensureReportFilter(datasetId));
    });
  }

  protected select(datasetId: number): void {
    this.selectedDatasetId.set(datasetId);
  }

  protected datasetName(datasetId: number): string {
    return this.session.datasets().find((d) => d.id === datasetId)?.name ?? 'Dataset';
  }

  protected conditionCount(datasetId: number): string {
    const count = this.session.model()?.reportFilter(datasetId)?.group.count() ?? 0;
    return count === 0 ? 'No conditions' : `${count} condition${count > 1 ? 's' : ''}`;
  }
}

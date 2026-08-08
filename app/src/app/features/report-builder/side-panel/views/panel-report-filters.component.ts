import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ReportBuilderStore } from '../../report-builder.store';
import { FilterBuilderComponent } from '../filter-builder/filter-builder.component';

/**
 * Report-level filters, scoped per dataset. Each one applies to every table on
 * the report bound to that dataset, on top of the table's own filter.
 */
@Component({
  selector: 'app-panel-report-filters',
  imports: [ButtonModule, FilterBuilderComponent],
  template: `
    @if (datasetIds().length === 0) {
      <p class="panel-empty">
        Add a table and bind it to a dataset — report filters apply per dataset.
      </p>
    } @else {
      <p class="panel-hint">
        Applies to every table on this report using the selected dataset.
      </p>

      @if (datasetIds().length > 1) {
        <nav class="panel-menu">
          @for (id of datasetIds(); track id) {
            <button
              type="button"
              class="panel-menu-item"
              [class.panel-menu-item--active]="id === activeDatasetId()"
              (click)="select(id)"
            >
              <i class="pi pi-database" aria-hidden="true"></i>
              <span class="panel-menu-text">
                <span class="panel-menu-label">{{ datasetName(id) }}</span>
                <span class="panel-menu-hint">{{ conditionCount(id) }}</span>
              </span>
            </button>
          }
        </nav>
      }

      @if (activeFilter(); as filter) {
        <app-filter-builder [group]="filter.group" [hint]="'Filtering ' + filter.datasetName()" />
      }
    }
  `,
  styles: `
    .panel-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 4px;
    }

    .panel-menu-item--active {
      background: var(--p-primary-50, #eef3fa);
      border-color: var(--p-primary-200, #adc3e5);
    }
  `,
})
export class PanelReportFiltersComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly datasetIds = computed(() => this.store.model()?.usedDatasetIds() ?? []);

  /** Which dataset's filter is on screen; defaults to the first one in use. */
  private readonly selectedDatasetId = signal<string | null>(null);
  protected readonly activeDatasetId = computed(
    () => this.selectedDatasetId() ?? this.datasetIds()[0] ?? null,
  );

  protected readonly activeFilter = computed(() => {
    const datasetId = this.activeDatasetId();
    const model = this.store.model();
    return datasetId && model ? model.reportFilter(datasetId) : null;
  });

  constructor() {
    // Creating the filter is a write, so it happens here rather than inside the
    // computed above — the panel always needs one to bind to.
    effect(() => {
      const datasetId = this.activeDatasetId();
      const model = this.store.model();
      if (!datasetId || !model) return;
      untracked(() => model.ensureReportFilter(datasetId));
    });
  }

  protected select(datasetId: string): void {
    this.selectedDatasetId.set(datasetId);
  }

  protected datasetName(datasetId: string): string {
    return this.store.datasets().find((d) => d.id === datasetId)?.name ?? 'Dataset';
  }

  protected conditionCount(datasetId: string): string {
    const count = this.store.model()?.reportFilter(datasetId)?.group.count() ?? 0;
    return count === 0 ? 'No conditions' : `${count} condition${count > 1 ? 's' : ''}`;
  }
}

import { Component, inject } from '@angular/core';
import { ReportBuilderStore } from '../../report-builder.store';
import { FilterBuilderComponent } from '../filter-builder/filter-builder.component';

@Component({
  selector: 'app-panel-widget-filters',
  imports: [FilterBuilderComponent],
  template: `
    @if (table(); as table) {
      @if (!table.datasetId()) {
        <p class="panel-empty">Pick a dataset for this table before adding filters.</p>
      } @else {
        <app-filter-builder
          [group]="table.filter"
          hint="Narrows the rows this table shows. Report filters apply on top of these."
        />
      }
    }
  `,
})
export class PanelWidgetFiltersComponent {
  private readonly store = inject(ReportBuilderStore);
  protected readonly table = this.store.selectedTableWidget;
}

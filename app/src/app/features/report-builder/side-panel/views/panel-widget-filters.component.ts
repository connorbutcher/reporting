import { Component, inject } from '@angular/core';
import { ReportBuilderStore } from '../../report-builder.store';
import { FilterBuilderComponent } from '../filter-builder/filter-builder.component';

@Component({
  selector: 'app-panel-widget-filters',
  imports: [FilterBuilderComponent],
  template: `
    @if (widget(); as widget) {
      @if (!widget.datasetId()) {
        <p class="panel-empty">Pick a dataset for this widget before adding filters.</p>
      } @else {
        <app-filter-builder
          [group]="widget.filter"
          hint="Narrows the rows this widget shows. Report filters apply on top of these."
        />
      }
    }
  `,
})
export class PanelWidgetFiltersComponent {
  private readonly store = inject(ReportBuilderStore);
  protected readonly widget = this.store.selectedFilterableWidget;
}

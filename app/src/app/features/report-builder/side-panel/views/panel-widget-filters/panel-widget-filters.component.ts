import { Component, inject } from '@angular/core';
import { ReportBuilderStore } from '../../../report-builder.store';
import { FilterBuilderComponent } from '../../filter-builder/filter-builder.component';

@Component({
  selector: 'app-panel-widget-filters',
  imports: [FilterBuilderComponent],
  templateUrl: './panel-widget-filters.component.html',
})
export class PanelWidgetFiltersComponent {
  private readonly store = inject(ReportBuilderStore);
  protected readonly widget = this.store.selectedFilterableWidget;
}

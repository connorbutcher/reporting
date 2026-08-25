import { Component, computed, inject } from '@angular/core';
import { ChartWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { FilterBuilderComponent } from '../../filter-builder/filter-builder.component';

@Component({
  selector: 'app-panel-widget-filters',
  imports: [FilterBuilderComponent],
  templateUrl: './panel-widget-filters.component.html',
})
export class PanelWidgetFiltersComponent {
  static readonly title = 'Filters';

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);
  private readonly widget = this.session.selectedFilterableWidget;

  /**
   * The filter this screen edits: a specific chart binding's when the view names
   * one (an overlaid dataset), otherwise the widget's own — a table's, or a
   * single-binding chart's first series.
   */
  protected readonly target = computed(() => {
    const widget = this.widget();
    if (!widget) return null;

    const view = this.navigation.view();
    if (widget instanceof ChartWidgetModel && view.kind === 'widgetFilters' && view.bindingId) {
      const binding = widget.binding(view.bindingId);
      if (binding) return { datasetId: binding.datasetId, filter: binding.filter };
    }
    return { datasetId: widget.datasetId, filter: widget.filter };
  });
}

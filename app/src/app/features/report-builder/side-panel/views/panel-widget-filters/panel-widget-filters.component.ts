import { Component, computed, inject } from '@angular/core';
import { ChartWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { FilterBuilderComponent } from '../../filter-builder/filter-builder.component';
import { PanelFilterReuseComponent } from '../panel-filter-reuse/panel-filter-reuse.component';

@Component({
  selector: 'app-panel-widget-filters',
  imports: [FilterBuilderComponent, PanelFilterReuseComponent],
  templateUrl: './panel-widget-filters.component.html',
})
export class PanelWidgetFiltersComponent {
  public static readonly title = 'Filters';

  /**
   * The filter this screen edits: a specific chart binding's when the view names
   * one (an overlaid dataset), otherwise the widget's own — a table's, or a
   * single-binding chart's first series.
   */
  public readonly target = computed(() => {
    const widget = this.widget();
    if (!widget) return null;

    const view = this.navigation.view();
    if (widget instanceof ChartWidgetModel && view.kind === 'widgetFilters' && view.bindingId) {
      const binding = widget.binding(view.bindingId);
      if (binding) return { datasetId: binding.datasetId, filter: binding.filter };
    }
    return { datasetId: widget.datasetId, filter: widget.filter };
  });

  /** The report-level filter already layered on top of this widget's own, for the live count. */
  public readonly reportFilter = computed(() => {
    const datasetId = this.target()?.datasetId() ?? null;
    const model = this.session.model();
    return datasetId && model ? (model.reportFilter(datasetId)?.group.toQueryDto() ?? null) : null;
  });

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);
  private readonly widget = this.session.selectedFilterableWidget;
}

import { Component, computed, inject } from '@angular/core';
import { ChartWidgetModel, KpiWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { FilterBuilderComponent } from '../../filter-builder/filter-builder.component';
import { PanelFilterReuseComponent } from '../panel-filter-reuse/panel-filter-reuse.component';

/**
 * The bindingId shapes a KPI's "Filters" nav uses, distinct from a chart binding's own id (a bare
 * uuid) so the breadcrumb (see `panel-component.registry.ts`) can tell them apart without needing
 * to know which widget kind owns the view.
 */
export const KPI_COMPARISON_BINDING_ID = 'comparison';

/** Builds a KPI measure's filter bindingId from its measure id. */
export function kpiMeasureFilterBindingId(measureId: string): string {
  return `measure:${measureId}`;
}

/** The measure id inside a KPI measure filter bindingId, or null for any other shape. */
export function kpiMeasureBindingId(bindingId: string): string | null {
  return bindingId.startsWith('measure:') ? bindingId.slice('measure:'.length) : null;
}

/** Whether a `widgetFilters` bindingId belongs to a KPI (its comparison or a measure), not a chart series. */
export function isKpiFilterBindingId(bindingId: string): boolean {
  return bindingId === KPI_COMPARISON_BINDING_ID || kpiMeasureBindingId(bindingId) !== null;
}

@Component({
  selector: 'app-panel-widget-filters',
  imports: [FilterBuilderComponent, PanelFilterReuseComponent],
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
    if (widget instanceof KpiWidgetModel && view.kind === 'widgetFilters' && view.bindingId) {
      if (view.bindingId === KPI_COMPARISON_BINDING_ID) {
        return { datasetId: widget.datasetId, filter: widget.comparisonFilter };
      }
      const measureId = kpiMeasureBindingId(view.bindingId);
      const measure = measureId && widget.measures().find((m) => m.measureId === measureId);
      if (measure) return { datasetId: widget.datasetId, filter: measure.filter };
    }
    return { datasetId: widget.datasetId, filter: widget.filter };
  });
}

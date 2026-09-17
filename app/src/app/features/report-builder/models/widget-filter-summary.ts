import { ChartWidgetModel } from './chart-widget.model';
import { DataTableWidgetModel } from './data-table-widget.model';
import { PivotTableWidgetModel } from './pivot-table-widget.model';
import { WidgetModel } from './widget-model-base';

/**
 * How many of a widget's own filter conditions are switched on — the widget list's badge count.
 * A chart sums across every binding, since each overlaid dataset filters independently. Excludes
 * the report-level filter, which is shown separately per dataset in the report filters view.
 */
export function widgetFilterCount(widget: WidgetModel): number {
  if (widget instanceof DataTableWidgetModel || widget instanceof PivotTableWidgetModel) {
    return widget.filter.enabledCount();
  }
  if (widget instanceof ChartWidgetModel) {
    return widget.bindings().reduce((n, b) => n + b.filter.enabledCount(), 0);
  }
  return 0;
}

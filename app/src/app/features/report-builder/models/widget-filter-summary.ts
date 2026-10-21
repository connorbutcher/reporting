import { ChartWidgetModel } from './chart-widget.model';
import { DataTableWidgetModel } from './data-table-widget.model';
import { KpiWidgetModel } from './kpi-widget.model';
import { PivotTableWidgetModel } from './pivot-table-widget.model';
import { WidgetModel } from './widget-model-base';

/** Summarises a widget's own filters for the widget list. */
export class WidgetFilterSummary {
  /**
   * How many of a widget's own filter conditions are switched on — the widget list's badge count.
   * A chart sums across every binding, since each overlaid dataset filters independently. Excludes
   * the report-level filter, which is shown separately per dataset in the report filters view.
   */
  public static count(widget: WidgetModel): number {
    if (
      widget instanceof DataTableWidgetModel ||
      widget instanceof PivotTableWidgetModel ||
      widget instanceof KpiWidgetModel
    ) {
      return widget.filter.enabledCount();
    }
    if (widget instanceof ChartWidgetModel) {
      return widget.bindings().reduce((n, b) => n + b.filter.enabledCount(), 0);
    }
    return 0;
  }
}

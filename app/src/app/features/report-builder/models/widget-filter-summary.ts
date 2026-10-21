import { ChartWidgetModel } from './chart-widget.model';
import { DataTableWidgetModel } from './data-table-widget.model';
import { KpiWidgetModel } from './kpi-widget.model';
import { PivotTableWidgetModel } from './pivot-table-widget.model';
import { WidgetModel } from './widget-model-base';

export class WidgetFilterSummary {
  /**
   * How many of a widget's own filter conditions are on, for the widget list badge. A chart sums every
   * binding; the report-level filter isn't counted.
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

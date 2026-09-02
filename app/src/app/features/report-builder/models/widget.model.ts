import { Widget } from '../../../core/models/report';
import { BarChartWidgetModel } from './bar-chart-widget.model';
import { BoxPlotWidgetModel } from './box-plot-widget.model';
import { DataTableWidgetModel } from './data-table-widget.model';
import { LineChartWidgetModel } from './line-chart-widget.model';
import { ScatterChartWidgetModel } from './scatter-chart-widget.model';
import { StaticTextWidgetModel } from './static-text-widget.model';
import { ModelSources, WidgetModel } from './widget-model-base';

export * from './widget-model-base';
export * from './data-table-widget.model';
export * from './chart-binding.model';
export * from './chart-widget.model';
export * from './scatter-chart-widget.model';
export * from './line-chart-widget.model';
export * from './bar-chart-widget.model';
export * from './box-plot-widget.model';
export * from './static-text-widget.model';

/** Rebuilds the right model class for a stored widget. */
export function widgetModelFromDto(widget: Widget, sources: ModelSources): WidgetModel {
  switch (widget.type) {
    case 'dataTable':
      return new DataTableWidgetModel(widget, sources);
    case 'scatterChart':
      return new ScatterChartWidgetModel(widget, sources);
    case 'lineChart':
      return new LineChartWidgetModel(widget, sources);
    case 'barChart':
      return new BarChartWidgetModel(widget, sources);
    case 'boxPlot':
      return new BoxPlotWidgetModel(widget, sources);
    default:
      return new StaticTextWidgetModel(widget);
  }
}

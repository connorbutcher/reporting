import { Widget } from '../../../core/models/report';
import { BarChartWidgetModel } from './bar-chart-widget.model';
import { BoxPlotWidgetModel } from './box-plot-widget.model';
import { ComboChartWidgetModel } from './combo-chart-widget.model';
import { DataTableWidgetModel } from './data-table-widget.model';
import { HistogramWidgetModel } from './histogram-widget.model';
import { KpiWidgetModel } from './kpi-widget.model';
import { LineChartWidgetModel } from './line-chart-widget.model';
import { PivotTableWidgetModel } from './pivot-table-widget.model';
import { ScatterChartWidgetModel } from './scatter-chart-widget.model';
import { StaticTextWidgetModel } from './static-text-widget.model';
import { XBarRChartWidgetModel } from './xbar-r-chart-widget.model';
import { WidgetModel } from './widget-model-base';
import { ModelSources } from './sources/model-sources';

export class WidgetModelFactory {
  /** Rebuilds the right model class for a stored widget. */
  public static fromDto(widget: Widget, sources: ModelSources): WidgetModel {
    switch (widget.type) {
      case 'dataTable':
        return new DataTableWidgetModel(widget, sources);
      case 'pivotTable':
        return new PivotTableWidgetModel(widget, sources);
      case 'kpi':
        return new KpiWidgetModel(widget, sources);
      case 'scatterChart':
        return new ScatterChartWidgetModel(widget, sources);
      case 'lineChart':
        return new LineChartWidgetModel(widget, sources);
      case 'barChart':
        return new BarChartWidgetModel(widget, sources);
      case 'comboChart':
        return new ComboChartWidgetModel(widget, sources);
      case 'boxPlot':
        return new BoxPlotWidgetModel(widget, sources);
      case 'histogram':
        return new HistogramWidgetModel(widget, sources);
      case 'xbarRChart':
        return new XBarRChartWidgetModel(widget, sources);
      default:
        return new StaticTextWidgetModel(widget);
    }
  }
}

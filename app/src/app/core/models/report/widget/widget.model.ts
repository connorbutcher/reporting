import { DataTableWidget } from './data-table-widget.model';
import { StaticTextWidget } from './static-text-widget.model';
import { ScatterChartWidget } from './scatter-chart-widget.model';
import { LineChartWidget } from './line-chart-widget.model';
import { BarChartWidget } from './bar-chart-widget.model';
import { ComboChartWidget } from './combo-chart-widget.model';
import { BoxPlotWidget } from './box-plot-widget.model';
import { HistogramWidget } from './histogram-widget.model';
import { PivotTableWidget } from './pivot-table-widget.model';
import { XBarRChartWidget } from './xbar-r-chart-widget.model';
import { KpiWidget } from './kpi-widget.model';

export type Widget =
  | DataTableWidget
  | StaticTextWidget
  | ScatterChartWidget
  | LineChartWidget
  | BarChartWidget
  | ComboChartWidget
  | BoxPlotWidget
  | HistogramWidget
  | PivotTableWidget
  | XBarRChartWidget
  | KpiWidget;

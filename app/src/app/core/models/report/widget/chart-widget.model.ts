import { ScatterChartWidget } from './scatter-chart-widget.model';
import { LineChartWidget } from './line-chart-widget.model';
import { BarChartWidget } from './bar-chart-widget.model';
import { ComboChartWidget } from './combo-chart-widget.model';
import { BoxPlotWidget } from './box-plot-widget.model';
import { HistogramWidget } from './histogram-widget.model';
import { XBarRChartWidget } from './xbar-r-chart-widget.model';

/** Every chart kind, for code that treats charts uniformly. */
export type ChartWidget =
  | ScatterChartWidget
  | LineChartWidget
  | BarChartWidget
  | ComboChartWidget
  | BoxPlotWidget
  | HistogramWidget
  | XBarRChartWidget;

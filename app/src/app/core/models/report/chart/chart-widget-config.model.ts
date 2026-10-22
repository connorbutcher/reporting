import { ScatterChartWidgetConfig } from './scatter-chart-widget-config.model';
import { LineChartWidgetConfig } from './line-chart-widget-config.model';
import { BarChartWidgetConfig } from './bar-chart-widget-config.model';
import { ComboChartWidgetConfig } from './combo-chart-widget-config.model';
import { BoxPlotWidgetConfig } from './box-plot-widget-config.model';
import { HistogramWidgetConfig } from './histogram-widget-config.model';
import { XBarRChartWidgetConfig } from './xbar-r-chart-widget-config.model';

export type ChartWidgetConfig =
  | ScatterChartWidgetConfig
  | LineChartWidgetConfig
  | BarChartWidgetConfig
  | ComboChartWidgetConfig
  | BoxPlotWidgetConfig
  | HistogramWidgetConfig
  | XBarRChartWidgetConfig;

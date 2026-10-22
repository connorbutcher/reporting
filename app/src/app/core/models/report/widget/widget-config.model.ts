import { DataTableWidgetConfig } from '../table/data-table-widget-config.model';
import { StaticTextWidgetConfig } from '../text/static-text-widget-config.model';
import { ScatterChartWidgetConfig } from '../chart/scatter-chart-widget-config.model';
import { LineChartWidgetConfig } from '../chart/line-chart-widget-config.model';
import { BarChartWidgetConfig } from '../chart/bar-chart-widget-config.model';
import { ComboChartWidgetConfig } from '../chart/combo-chart-widget-config.model';
import { BoxPlotWidgetConfig } from '../chart/box-plot-widget-config.model';
import { HistogramWidgetConfig } from '../chart/histogram-widget-config.model';
import { PivotTableWidgetConfig } from '../pivot/pivot-table-widget-config.model';
import { XBarRChartWidgetConfig } from '../chart/xbar-r-chart-widget-config.model';
import { KpiWidgetConfig } from '../kpi/kpi-widget-config.model';

export type WidgetConfig =
  | DataTableWidgetConfig
  | StaticTextWidgetConfig
  | ScatterChartWidgetConfig
  | LineChartWidgetConfig
  | BarChartWidgetConfig
  | ComboChartWidgetConfig
  | BoxPlotWidgetConfig
  | HistogramWidgetConfig
  | PivotTableWidgetConfig
  | XBarRChartWidgetConfig
  | KpiWidgetConfig;

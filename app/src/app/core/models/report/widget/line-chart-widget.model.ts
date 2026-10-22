import { WidgetBase } from './widget-base.model';
import { LineChartWidgetConfig } from '../chart/line-chart-widget-config.model';

export type LineChartWidget = WidgetBase & {
  type: 'lineChart';
  config: LineChartWidgetConfig;
};

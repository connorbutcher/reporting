import { WidgetBase } from './widget-base.model';
import { BarChartWidgetConfig } from '../chart/bar-chart-widget-config.model';

export type BarChartWidget = WidgetBase & {
  type: 'barChart';
  config: BarChartWidgetConfig;
};

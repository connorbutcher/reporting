import { WidgetBase } from './widget-base.model';
import { XBarRChartWidgetConfig } from '../chart/xbar-r-chart-widget-config.model';

export type XBarRChartWidget = WidgetBase & {
  type: 'xbarRChart';
  config: XBarRChartWidgetConfig;
};

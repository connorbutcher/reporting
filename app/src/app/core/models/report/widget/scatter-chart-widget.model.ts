import { WidgetBase } from './widget-base.model';
import { ScatterChartWidgetConfig } from '../chart/scatter-chart-widget-config.model';

export type ScatterChartWidget = WidgetBase & {
  type: 'scatterChart';
  config: ScatterChartWidgetConfig;
};

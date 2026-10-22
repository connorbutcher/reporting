import { WidgetBase } from './widget-base.model';
import { ComboChartWidgetConfig } from '../chart/combo-chart-widget-config.model';

export type ComboChartWidget = WidgetBase & {
  type: 'comboChart';
  config: ComboChartWidgetConfig;
};

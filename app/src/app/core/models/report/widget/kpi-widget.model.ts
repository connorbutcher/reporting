import { WidgetBase } from './widget-base.model';
import { KpiWidgetConfig } from '../kpi/kpi-widget-config.model';

export type KpiWidget = WidgetBase & {
  type: 'kpi';
  config: KpiWidgetConfig;
};

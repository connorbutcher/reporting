import { WidgetBase } from './widget-base.model';
import { PivotTableWidgetConfig } from '../pivot/pivot-table-widget-config.model';

export type PivotTableWidget = WidgetBase & {
  type: 'pivotTable';
  config: PivotTableWidgetConfig;
};

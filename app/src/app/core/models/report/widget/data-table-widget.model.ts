import { WidgetBase } from './widget-base.model';
import { DataTableWidgetConfig } from '../table/data-table-widget-config.model';

export type DataTableWidget = WidgetBase & {
  type: 'dataTable';
  config: DataTableWidgetConfig;
};

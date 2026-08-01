export type WidgetType = 'dataTable';

export interface DataTableWidgetConfig {
  type: 'dataTable';
  datasetId: string;
}

export type WidgetConfig = DataTableWidgetConfig;

export interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: WidgetConfig;
}

export interface Report {
  id: string;
  name: string;
  columns: number;
  rows: number;
  widgets: Widget[];
}

export type WidgetType =
  | 'dataTable'
  | 'staticText'
  | 'scatterChart'
  | 'lineChart'
  | 'barChart'
  | 'comboChart'
  | 'boxPlot'
  | 'histogram'
  | 'pivotTable'
  | 'xbarRChart'
  | 'kpi';

/** Fields every widget config carries, regardless of type. */
export type WidgetConfigBase = {
  title: string;
  showTitle: boolean;
};

/** Geometry every widget carries on the grid, regardless of type. */
export type WidgetBase = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

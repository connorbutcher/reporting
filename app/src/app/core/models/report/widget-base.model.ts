export type WidgetType =
  | 'dataTable'
  | 'staticText'
  | 'scatterChart'
  | 'lineChart'
  | 'barChart'
  | 'boxPlot';

/** Fields every widget config carries, regardless of type. */
export interface WidgetConfigBase {
  title: string;
  showTitle: boolean;
}

/** Geometry every widget carries on the grid, regardless of type. */
export interface WidgetBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

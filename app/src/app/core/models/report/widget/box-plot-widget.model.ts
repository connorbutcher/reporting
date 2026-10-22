import { WidgetBase } from './widget-base.model';
import { BoxPlotWidgetConfig } from '../chart/box-plot-widget-config.model';

export type BoxPlotWidget = WidgetBase & {
  type: 'boxPlot';
  config: BoxPlotWidgetConfig;
};

import { WidgetBase } from './widget-base.model';
import { HistogramWidgetConfig } from '../chart/histogram-widget-config.model';

export type HistogramWidget = WidgetBase & {
  type: 'histogram';
  config: HistogramWidgetConfig;
};

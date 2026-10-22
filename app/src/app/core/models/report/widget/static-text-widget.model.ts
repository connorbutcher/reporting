import { WidgetBase } from './widget-base.model';
import { StaticTextWidgetConfig } from '../text/static-text-widget-config.model';

export type StaticTextWidget = WidgetBase & {
  type: 'staticText';
  config: StaticTextWidgetConfig;
};

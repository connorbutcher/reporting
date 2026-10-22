import { ViewFilterEntry } from './view-filter-entry';
import { ViewFilterWidget } from './view-filter-widget';

export type WidgetFilterEntry = ViewFilterEntry & {
  readonly widget: ViewFilterWidget;
};

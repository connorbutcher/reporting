import { PageFilterEntry } from './page-filter-entry';
import { WidgetFilterEntry } from './widget-filter-entry';

export type ViewFilterEntries = {
  readonly pageEntries: PageFilterEntry[];
  readonly widgetEntries: WidgetFilterEntry[];
};

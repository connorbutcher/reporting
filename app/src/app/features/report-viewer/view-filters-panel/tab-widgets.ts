import { ViewWidgetFilters } from '../filters/view-widget-filters';

export type TabWidgets = {
  readonly tabName: string;
  readonly items: readonly ViewWidgetFilters[];
};

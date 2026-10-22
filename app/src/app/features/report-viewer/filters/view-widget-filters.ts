import { Signal } from '@angular/core';
import { ViewFilterWidget } from './view-filter-widget';
import { WidgetFilterEntry } from './widget-filter-entry';

/** One widget as the panel lists it: several entries only for a chart overlaying several datasets. */
export type ViewWidgetFilters = {
  readonly widget: ViewFilterWidget;
  /** Never empty. */
  readonly entries: readonly WidgetFilterEntry[];
  /** The dataset picker's choices. */
  readonly options: Signal<{ key: string; label: string }[]>;
  readonly changed: Signal<boolean>;
  /** Across all the widget's datasets, so a collapsed row never hides that one is filtered. */
  readonly summary: Signal<string>;
};

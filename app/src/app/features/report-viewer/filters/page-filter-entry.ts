import { Signal } from '@angular/core';
import { ViewFilterEntry } from './view-filter-entry';

export type PageFilterEntry = ViewFilterEntry & {
  readonly label: Signal<string>;
};

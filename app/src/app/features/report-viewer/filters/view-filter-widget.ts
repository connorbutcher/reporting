import { Signal } from '@angular/core';
import { WidgetType } from '../../../core/models/report';

export type ViewFilterWidget = {
  readonly id: string;
  readonly title: string;
  readonly type: WidgetType;
  readonly icon: string;
  readonly tabName: string;
  /** Tells this filter from the widget's others: the series label, else the dataset name. */
  readonly sourceLabel: Signal<string>;
};

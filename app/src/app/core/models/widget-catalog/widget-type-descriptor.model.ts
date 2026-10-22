import { WidgetType } from '../report';
import { WidgetGroup } from './widget-group.model';

export type WidgetTypeDescriptor = {
  type: WidgetType;
  label: string;
  /** One-line description shown under the label in the add-widget menu. */
  hint: string;
  /** PrimeIcons class, e.g. 'pi pi-chart-scatter'. */
  icon: string;
  group: WidgetGroup;
};

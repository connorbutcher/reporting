import { WidgetGroup } from './widget-group.model';

export type WidgetGroupInfo = {
  id: WidgetGroup;
  label: string;
  /** Display order of the group in the add-widget menu. */
  order: number;
};

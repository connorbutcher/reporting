import { FilterGroup } from '../../../../core/models/filter';
import { Widget } from '../../../../core/models/report';
import { WidgetOutputHandler } from '../widget-output-handler';

/** Values are passed as functions so the dialog tracks the host's signals while open. */
export type WidgetFullscreenDialogData = {
  widget: () => Widget;
  title: () => string;
  reportFilter: () => FilterGroup | null;
  widgetFilter: () => FilterGroup | null;
  bindingFilters: () => Record<string, FilterGroup | null> | null;
  datasetVersion: () => number;
  widgetOutputs: Record<string, WidgetOutputHandler>;
};

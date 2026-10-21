import { FilterGroup } from '../../../../core/models/filter/index';
import { Widget } from '../../../../core/models/report/index';
import { WidgetOutputHandler } from '../widget-output-handler';

/**
 * What a widget's header hands this dialog to re-render the same widget at full
 * size. Every reactive value is read through a function rather than passed as a
 * plain value, so the dialog stays live if the underlying report changes while
 * it's open — calling the host's own signal from here still tracks it.
 */
export interface WidgetFullscreenDialogData {
  widget: () => Widget;
  title: () => string;
  reportFilter: () => FilterGroup | null;
  widgetFilter: () => FilterGroup | null;
  bindingFilters: () => Record<string, FilterGroup | null> | null;
  datasetVersion: () => number;
  widgetOutputs: Record<string, WidgetOutputHandler>;
}

import { Widget } from '../../../core/models/report.model';
import { ChartWidgetModel } from './chart-widget.model';
import { DataTableWidgetModel } from './data-table-widget.model';
import { StaticTextWidgetModel } from './static-text-widget.model';
import { ModelSources, WidgetModel } from './widget-model-base';

export * from './widget-model-base';
export * from './data-table-widget.model';
export * from './chart-widget.model';
export * from './static-text-widget.model';

/** Rebuilds the right model class for a stored widget. */
export function widgetModelFromDto(widget: Widget, sources: ModelSources): WidgetModel {
  switch (widget.type) {
    case 'dataTable':
      return new DataTableWidgetModel(widget, sources);
    case 'chart':
      return new ChartWidgetModel(widget, sources);
    default:
      return new StaticTextWidgetModel(widget);
  }
}

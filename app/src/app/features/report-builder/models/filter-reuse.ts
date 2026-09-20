import { FilterGroupModel } from './filter';
import { ReportModel } from './report.model';
import { ChartWidgetModel, DataTableWidgetModel, PivotTableWidgetModel } from './widget.model';

/** A filter elsewhere on the report that could be copied into the one being edited. */
export interface ReusableFilter {
  readonly label: string;
  readonly group: FilterGroupModel;
}

/**
 * Every other non-empty filter on the same dataset that could seed `target`: the report filter and
 * each table, pivot and chart-binding filter. Same dataset only, since a filter names columns by id.
 */
export function reusableFiltersFor(
  model: ReportModel,
  datasetId: number,
  target: FilterGroupModel,
): ReusableFilter[] {
  const sources: ReusableFilter[] = [];
  const add = (label: string, group: FilterGroupModel | null | undefined): void => {
    if (group && group !== target && group.count() > 0) sources.push({ label, group });
  };

  add('Report filter', model.reportFilter(datasetId)?.group);

  for (const tab of model.tabs()) {
    for (const widget of tab.widgets()) {
      if (widget instanceof DataTableWidgetModel || widget instanceof PivotTableWidgetModel) {
        if (widget.datasetId() === datasetId) add(widget.label(), widget.filter);
      } else if (widget instanceof ChartWidgetModel) {
        // A chart overlays a dataset per binding, so name the series when there's more than one.
        const many = widget.bindings().length > 1;
        for (const binding of widget.bindings()) {
          if (binding.datasetId() !== datasetId) continue;
          const series = binding.label().trim() || binding.schema()?.name || 'series';
          add(many ? `${widget.label()} · ${series}` : widget.label(), binding.filter);
        }
      }
    }
  }

  return sources;
}

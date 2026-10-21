import { FilterGroupModel } from './filter';
import { ReportModel } from './report.model';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  KpiWidgetModel,
  PivotTableWidgetModel,
  WidgetModel,
} from './widget.model';
import { ReusableFilter } from './reusable-filter';

/** Finds filters elsewhere on a report that could seed the one being edited. */
export class ReusableFilters {
  /**
   * Every other non-empty filter on the same dataset that could seed `target`: the report filter and
   * each table, pivot and chart-binding filter. Same dataset only, since a filter names columns by id.
   */
  public static find(
    model: ReportModel,
    datasetId: number,
    target: FilterGroupModel,
  ): ReusableFilter[] {
    const candidates: { label: string; group: FilterGroupModel | undefined }[] = [
      { label: 'Report filter', group: model.reportFilter(datasetId)?.group },
      ...model
        .tabs()
        .flatMap((tab) => tab.widgets())
        .flatMap((widget) => ReusableFilters.widgetFilters(widget, datasetId)),
    ];
    return candidates.filter(
      (c): c is ReusableFilter => !!c.group && c.group !== target && c.group.count() > 0,
    );
  }

  /** A widget's own filters on the dataset; a chart overlays one per binding, so names the series when there are several. */
  private static widgetFilters(widget: WidgetModel, datasetId: number): ReusableFilter[] {
    if (
      widget instanceof DataTableWidgetModel ||
      widget instanceof PivotTableWidgetModel ||
      widget instanceof KpiWidgetModel
    ) {
      return widget.datasetId() === datasetId
        ? [{ label: widget.label(), group: widget.filter }]
        : [];
    }
    if (!(widget instanceof ChartWidgetModel)) return [];

    const many = widget.bindings().length > 1;
    return widget
      .bindings()
      .filter((binding) => binding.datasetId() === datasetId)
      .map((binding) => {
        const series = binding.label().trim() || binding.schema()?.name || 'series';
        return {
          label: many ? `${widget.label()} · ${series}` : widget.label(),
          group: binding.filter,
        };
      });
  }
}

import { FilterCondition, FilterGroup, combineFilters } from '../../../../core/models/filter';
import { ChartWidgetConfig, readChartBindings } from '../../../../core/models/report';
import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  HistogramQueryResult,
  XBarRChartQueryResult,
} from '../../../../core/models/widget-query';
import { ChartDrillTarget } from './models/chart-drill-target';
import { ChartDrillClick } from './models/chart-drill-click';
import { ChartDrillContext } from './models/chart-drill-context';
import { GroupingResult } from './models/grouping-result';

/**
 * Turns a click on a bar, box, bin or control-chart point into a drill-through filter. Null when
 * the click can't be a filter ("Other", a reference line, a comment marker).
 */
export class ChartDrill {
  public static target(
    config: ChartWidgetConfig,
    data: GroupingResult | null,
    click: ChartDrillClick,
    bindingFilters: Record<string, FilterGroup | null> | null,
  ): ChartDrillTarget | null {
    const index = click.dataIndex;
    if (!data || index == null || index < 0) {
      return null;
    }
    const context: ChartDrillContext = {
      index,
      seriesName: click.seriesName,
      bindings: readChartBindings(config),
      bindingFilters,
    };

    switch (config.type) {
      case 'barChart':
      case 'comboChart':
        return ChartDrill.barTarget(data as BarChartQueryResult, context);
      case 'boxPlot':
        return ChartDrill.boxTarget(data as BoxPlotQueryResult, context);
      case 'histogram':
        return ChartDrill.histogramTarget(data as HistogramQueryResult, context);
      case 'xbarRChart':
        return ChartDrill.xbarRTarget(data as XBarRChartQueryResult, context);
      default:
        return null;
    }
  }

  private static barTarget(
    bar: BarChartQueryResult,
    { index, seriesName, bindings, bindingFilters }: ChartDrillContext,
  ): ChartDrillTarget | null {
    const series =
      bar.series.find((s) => s.label === seriesName) ??
      (bar.series.length === 1 ? bar.series[0] : null);
    const binding =
      bindings.find((b) => b.id === series?.bindingId) ?? bindings.find((b) => b.datasetId);
    const category = series?.categoryDrills?.[index] ?? bar.categoryDetails?.[index]?.drill ?? null;
    if (!series || !binding?.datasetId || !category) {
      return null;
    }
    return {
      datasetId: binding.datasetId,
      path: ChartDrill.path(bar.categories[index], series.label),
      filter: combineFilters(
        ChartDrill.bindingFilter(bindingFilters, binding.id),
        category,
        series.drill ?? null,
      ),
    };
  }

  private static boxTarget(
    box: BoxPlotQueryResult,
    { index, seriesName, bindings, bindingFilters }: ChartDrillContext,
  ): ChartDrillTarget | null {
    const primary = bindings[0];
    const series =
      box.series.find((s) => s.label === seriesName) ??
      (box.series.length === 1 ? box.series[0] : null);
    const category = box.categoryDetails?.[index]?.drill ?? null;
    if (!primary?.datasetId || !category) {
      return null;
    }
    return {
      datasetId: primary.datasetId,
      path: ChartDrill.path(box.categories[index], series?.label ?? ''),
      filter: combineFilters(
        ChartDrill.bindingFilter(bindingFilters, primary.id),
        category,
        series?.drill ?? null,
      ),
    };
  }

  private static histogramTarget(
    histogram: HistogramQueryResult,
    { index, seriesName, bindings, bindingFilters }: ChartDrillContext,
  ): ChartDrillTarget | null {
    const series = histogram.series.find((s) => s.label === seriesName) ?? histogram.series[0];
    const binding =
      bindings.find((b) => b.id === series?.bindingId) ?? bindings.find((b) => b.datasetId);
    const bin = histogram.bins[index];
    const columnId = series?.valueColumnId ?? binding?.xColumnId;
    if (!series || !binding?.datasetId || !bin || !columnId) {
      return null;
    }
    const last = index === histogram.bins.length - 1;
    return {
      datasetId: binding.datasetId,
      path: ChartDrill.path(bin.label, series.label),
      filter: combineFilters(
        ChartDrill.bindingFilter(bindingFilters, binding.id),
        ChartDrill.binRange(columnId, bin.lower, bin.upper, last),
        series.drill ?? null,
      ),
    };
  }

  private static xbarRTarget(
    control: XBarRChartQueryResult,
    { index, bindings, bindingFilters }: ChartDrillContext,
  ): ChartDrillTarget | null {
    const primary = bindings[0];
    const category = control.categoryDetails?.[index]?.drill ?? null;
    if (!primary?.datasetId || !category) {
      return null;
    }
    return {
      datasetId: primary.datasetId,
      path: [control.categories[index]],
      filter: combineFilters(ChartDrill.bindingFilter(bindingFilters, primary.id), category),
    };
  }

  /** Bins are half-open, except the last, which holds the maximum. */
  private static binRange(
    columnId: string,
    lower: number,
    upper: number,
    last: boolean,
  ): FilterGroup {
    return {
      kind: 'group',
      join: 'and',
      children: [
        ChartDrill.condition(columnId, 'greaterThanOrEqual', lower),
        ChartDrill.condition(columnId, last ? 'lessThanOrEqual' : 'lessThan', upper),
      ],
    };
  }

  private static bindingFilter(
    bindingFilters: Record<string, FilterGroup | null> | null,
    bindingId: string | undefined,
  ): FilterGroup | null {
    return bindingId ? (bindingFilters?.[bindingId] ?? null) : null;
  }

  private static path(category: string, series: string): string[] {
    return series ? [category, series] : [category];
  }

  private static condition(
    columnId: string,
    operator: 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual',
    value: number,
  ): FilterCondition {
    return { kind: 'condition', columnId, operator, values: [String(value)] };
  }
}

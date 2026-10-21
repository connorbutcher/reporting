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
import { GroupingResult } from './models/grouping-result';

/**
 * Turns a click on a bar, box, histogram bin or control-chart point into the rows behind it — the
 * same drill-through the pivot offers. The server supplies each category's (and split series')
 * conditions; a histogram bin's range is built here from its edges. Null when the click can't be
 * expressed as a filter (the "Other" category, a reference line, a comment marker).
 */
export class ChartDrill {
  public static target(
    config: ChartWidgetConfig,
    data: GroupingResult | null,
    click: ChartDrillClick,
    bindingFilters: Record<string, FilterGroup | null> | null,
  ): ChartDrillTarget | null {
    const index = click.dataIndex;
    if (!data || index == null || index < 0) return null;
    const bindings = readChartBindings(config);

    switch (config.type) {
      case 'barChart':
      case 'comboChart': {
        const bar = data as BarChartQueryResult;
        const series =
          bar.series.find((s) => s.label === click.seriesName) ??
          (bar.series.length === 1 ? bar.series[0] : null);
        const binding =
          bindings.find((b) => b.id === series?.bindingId) ?? bindings.find((b) => b.datasetId);
        const category =
          series?.categoryDrills?.[index] ?? bar.categoryDetails?.[index]?.drill ?? null;
        if (!series || !binding?.datasetId || !category) return null;
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
      case 'boxPlot': {
        const box = data as BoxPlotQueryResult;
        const primary = bindings[0];
        const series =
          box.series.find((s) => s.label === click.seriesName) ??
          (box.series.length === 1 ? box.series[0] : null);
        const category = box.categoryDetails?.[index]?.drill ?? null;
        if (!primary?.datasetId || !category) return null;
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
      case 'histogram': {
        const histogram = data as HistogramQueryResult;
        const series =
          histogram.series.find((s) => s.label === click.seriesName) ?? histogram.series[0];
        const binding =
          bindings.find((b) => b.id === series?.bindingId) ?? bindings.find((b) => b.datasetId);
        const bin = histogram.bins[index];
        const columnId = series?.valueColumnId ?? binding?.xColumnId;
        if (!series || !binding?.datasetId || !bin || !columnId) return null;
        const last = index === histogram.bins.length - 1;
        const range: FilterGroup = {
          kind: 'group',
          join: 'and',
          children: [
            ChartDrill.condition(columnId, 'greaterThanOrEqual', bin.lower),
            // Bins are half-open, except the last, which holds the maximum.
            ChartDrill.condition(columnId, last ? 'lessThanOrEqual' : 'lessThan', bin.upper),
          ],
        };
        return {
          datasetId: binding.datasetId,
          path: ChartDrill.path(bin.label, series.label),
          filter: combineFilters(
            ChartDrill.bindingFilter(bindingFilters, binding.id),
            range,
            series.drill ?? null,
          ),
        };
      }
      case 'xbarRChart': {
        const control = data as XBarRChartQueryResult;
        const primary = bindings[0];
        const category = control.categoryDetails?.[index]?.drill ?? null;
        if (!primary?.datasetId || !category) return null;
        return {
          datasetId: primary.datasetId,
          path: [control.categories[index]],
          filter: combineFilters(ChartDrill.bindingFilter(bindingFilters, primary.id), category),
        };
      }
      default:
        return null;
    }
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

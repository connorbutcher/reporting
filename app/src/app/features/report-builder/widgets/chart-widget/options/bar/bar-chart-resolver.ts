import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  BarChartWidgetConfig,
  ChartSeriesBinding,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import { BarChartQueryResult, BarSeriesResult } from '../../../../../../core/models/widget-query';
import { CategoryZoom } from '../axes/category-zoom';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { BarChart } from './bar-chart';
import { BarValues } from './bar-values';

/** Resolves a bar chart's config and data into a {@link BarChart}. */
export class BarChartResolver {
  /** Null until there's a dataset and a category column bound. */
  public static resolve(
    config: BarChartWidgetConfig,
    data: BarChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): BarChart | null {
    // The first bound binding names the category axis; later bindings overlay their own bars.
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!categoryColumn) return null;

    const categories = data?.categories ?? [];
    const series = data?.series ?? [];
    const valueColumn = BarChartResolver.sharedMeasure(config, series, primary, columns);
    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const percent = !!config.percentStacked;
    const stacked = config.stacked || percent;

    return {
      config,
      data,
      categoryColumn,
      categories,
      series,
      seriesColors: BarValues.seriesColors(series, bindings, colors),
      valueColumn,
      valueConfig,
      seriesConfigs: BarValues.seriesConfigs(config.aggregate, series, columns, valueConfig),
      valueAxisConfig: readChartAxes(config)[0],
      horizontal: config.horizontal,
      percent,
      stacked,
      showLegend: series.length > 1 && config.showLegend,
      zoom: CategoryZoom.enabled(config.zoom, categories.length),
      stackTotals: stacked ? BarChartResolver.stackTotals(series, categories) : new Map(),
    };
  }

  /** The one measure every series plots, else null. A count has no measure. */
  private static sharedMeasure(
    config: BarChartWidgetConfig,
    series: readonly BarSeriesResult[],
    primary: ChartSeriesBinding | undefined,
    columns: DatasetColumn[],
  ): DatasetColumn | null {
    if (config.aggregate === 'count') return null;
    const measureIds = [
      ...new Set(
        series.map((s) => s.valueColumnId ?? primary?.yColumnId ?? null).filter((id) => id != null),
      ),
    ];
    return measureIds.length === 1 ? ChartColumns.byId(columns, measureIds[0]) : null;
  }

  private static stackTotals(
    series: readonly BarSeriesResult[],
    categories: string[],
  ): Map<string, number[]> {
    const stackTotals = new Map<string, number[]>();
    for (const s of series) {
      const stack = BarValues.stackOf(s);
      const totals = stackTotals.get(stack) ?? categories.map(() => 0);
      s.values.forEach((v, c) => (totals[c] += v ?? 0));
      stackTotals.set(stack, totals);
    }
    return stackTotals;
  }
}

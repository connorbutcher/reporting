import { DatasetColumn, NumericColumnConfig } from '../../../../../../core/models/dataset';
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
      colors,
      categoryColumn,
      categories,
      series,
      bindingsById: new Map(bindings.map((b) => [b.id, b])),
      seriesPerBinding: BarChartResolver.seriesPerBinding(series),
      valueColumn,
      valueConfig,
      seriesConfigs: BarChartResolver.seriesConfigs(config, series, columns, valueConfig),
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

  /** Each series reads through its own measure's format, else the shared one. */
  private static seriesConfigs(
    config: BarChartWidgetConfig,
    series: readonly BarSeriesResult[],
    columns: DatasetColumn[],
    valueConfig: NumericColumnConfig | undefined,
  ): Map<BarSeriesResult, NumericColumnConfig | undefined> {
    const isCount = config.aggregate === 'count';
    return new Map(
      series.map((s) => [
        s,
        isCount ? undefined : (BarValues.seriesNumericConfig(s, columns) ?? valueConfig),
      ]),
    );
  }

  private static seriesPerBinding(series: readonly BarSeriesResult[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId) counts.set(s.bindingId, (counts.get(s.bindingId) ?? 0) + 1);
    }
    return counts;
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

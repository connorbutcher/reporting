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
import { BarSeriesColors } from './values/bar-series-colors';
import { BarStacks } from './values/bar-stacks';
import { BarValueFormats } from './values/bar-value-formats';

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
      seriesColors: BarSeriesColors.of(series, bindings, colors),
      valueColumn,
      valueConfig,
      seriesConfigs: BarValueFormats.bySeries(config.aggregate, series, columns, valueConfig),
      valueAxisConfig: readChartAxes(config)[0],
      horizontal: config.horizontal,
      percent,
      stacked,
      showLegend: series.length > 1 && config.showLegend,
      zoom: CategoryZoom.enabled(config.zoom, categories.length),
      stackTotals: stacked ? BarStacks.totals(series, categories) : new Map(),
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
}

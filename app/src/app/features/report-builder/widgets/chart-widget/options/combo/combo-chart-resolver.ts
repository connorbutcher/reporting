import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  ChartSeriesBinding,
  ChartValueAxis,
  ComboChartWidgetConfig,
  chartAxisIndex,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import { BarChartQueryResult, BarSeriesResult } from '../../../../../../core/models/widget-query';
import { CategoryZoom } from '../axes/category-zoom';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { ComboChart } from './combo-chart';
import { ComboSeries } from './combo-series';
import { BarSeriesColors } from '../bar/values/bar-series-colors';
import { BarValueFormats } from '../bar/values/bar-value-formats';

/** Resolves a combination chart's config and data into a {@link ComboChart}. */
export class ComboChartResolver {
  /** Null until there's a dataset and a category column bound. */
  public static resolve(
    config: ComboChartWidgetConfig,
    data: BarChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ComboChart | null {
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!categoryColumn) {
      return null;
    }

    const categories = data?.categories ?? [];
    const rawSeries = data?.series ?? [];
    const axes = readChartAxes(config);
    const series = ComboChartResolver.comboSeries(rawSeries, bindings, axes, colors);
    const valueColumn = ComboChartResolver.primaryMeasure(config, series, primary, columns);
    const valueConfig = ChartFormat.numericConfig(valueColumn);

    return {
      config,
      data,
      categoryColumn,
      categories,
      series,
      axes,
      multiAxis: axes.length > 1,
      valueColumn,
      valueConfig,
      seriesConfigs: BarValueFormats.bySeries(config.aggregate, rawSeries, columns, valueConfig),
      showLegend: series.length > 1 && config.showLegend,
      zoom: CategoryZoom.enabled(config.zoom, categories.length),
    };
  }

  /** Render kind, axis and styling are read live from each series' binding, so edits re-render without a refetch. */
  private static comboSeries(
    rawSeries: readonly BarSeriesResult[],
    bindings: readonly ChartSeriesBinding[],
    axes: ChartValueAxis[],
    colors: Map<string, string>,
  ): ComboSeries[] {
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const seriesColors = BarSeriesColors.of(rawSeries, bindings, colors);
    return rawSeries.map((result) => {
      const binding = result.bindingId ? bindingsById.get(result.bindingId) : undefined;
      return {
        result,
        axisIndex: chartAxisIndex(axes, binding?.yAxisId ?? null),
        renderAs: binding?.renderAs ?? 'bar',
        color: seriesColors.get(result) ?? '',
        symbol: binding?.symbol ?? null,
        dashStyle: binding?.dashStyle ?? null,
      };
    });
  }

  /** The one measure every primary-axis series plots, else null. A count has no measure. */
  private static primaryMeasure(
    config: ComboChartWidgetConfig,
    series: readonly ComboSeries[],
    primary: ChartSeriesBinding | undefined,
    columns: DatasetColumn[],
  ): DatasetColumn | null {
    if (config.aggregate === 'count') {
      return null;
    }
    const measureIds = [
      ...new Set(
        series
          .filter((s) => s.axisIndex === 0)
          .map((s) => s.result.valueColumnId ?? primary?.yColumnId ?? null)
          .filter((id) => id != null),
      ),
    ];
    return measureIds.length === 1 ? ChartColumns.byId(columns, measureIds[0]) : null;
  }
}

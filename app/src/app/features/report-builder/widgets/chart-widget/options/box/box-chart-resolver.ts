import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  BoxPlotWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import { BoxPlotQueryResult } from '../../../../../../core/models/widget-query';
import { CategoryZoom } from '../axes/category-zoom';
import { SeriesColors } from '../colors/series-colors';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { BoxChart } from './box-chart';
import { BoxSeries } from './box-series';

/** Resolves a box plot's config and data into a {@link BoxChart}. */
export class BoxChartResolver {
  /** Null until there's a dataset and both a category and a value column bound. */
  public static resolve(
    config: BoxPlotWidgetConfig,
    data: BoxPlotQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): BoxChart | null {
    const primary = readChartBindings(config)[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const valueColumn = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    if (!categoryColumn || !valueColumn) return null;

    const categories = data?.categories ?? [];
    const results = data?.series ?? [];
    // A colour override applies only to a single series.
    const override = results.length === 1 ? primary?.color : null;
    const series: BoxSeries[] = results.map((result, i) => ({
      result,
      name: result.label || config.title || 'Series',
      color: override ?? SeriesColors.forSeries(colors, result.label, i),
    }));

    return {
      config,
      data,
      categoryColumn,
      valueColumn,
      valueConfig: ChartFormat.numericConfig(valueColumn),
      categories,
      series,
      valueAxisConfig: readChartAxes(config)[0],
      horizontal: config.horizontal,
      showPoints: config.showPoints ?? false,
      showLegend: series.length > 1 && config.showLegend,
      zoom: CategoryZoom.enabled(config.zoom, categories.length),
    };
  }
}

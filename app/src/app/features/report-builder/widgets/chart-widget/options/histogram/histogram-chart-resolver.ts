import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  HistogramWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import { HistogramQueryResult } from '../../../../../../core/models/widget-query';
import { SeriesColors } from '../colors/series-colors';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { HistogramBinAxis } from './histogram-bin-axis';
import { HistogramChart } from './histogram-chart';
import { HistogramSeries } from './histogram-series';

/** Resolves a histogram's config and data into a {@link HistogramChart}. */
export class HistogramChartResolver {
  /** Null until there's a dataset and a value column bound. */
  public static resolve(
    config: HistogramWidgetConfig,
    data: HistogramQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): HistogramChart | null {
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const valueColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!valueColumn) return null;

    const bins = data?.bins ?? [];
    const results = data?.series ?? [];
    // A colour override applies only to a single, unsplit distribution.
    const override = results.length === 1 ? (primary?.color ?? null) : null;
    const series: HistogramSeries[] = results.map((result, i) => ({
      result,
      name: result.label || config.title || 'Series',
      color: override ?? SeriesColors.forSeries(colors, result.label, i),
    }));

    return {
      config,
      data,
      valueColumn,
      bins,
      binLabels: HistogramBinAxis.labels(bins, ChartFormat.numericConfig(valueColumn)),
      series,
      countAxisConfig: readChartAxes(config)[0],
      horizontal: config.horizontal,
      showLegend: series.length > 1 && config.showLegend,
    };
  }
}

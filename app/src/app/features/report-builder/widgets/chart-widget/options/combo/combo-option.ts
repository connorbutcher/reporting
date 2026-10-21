import { DatasetColumn } from '../../../../../../core/models/dataset';
import { ComboChartWidgetConfig } from '../../../../../../core/models/report';
import { BarChartQueryResult } from '../../../../../../core/models/widget-query';
import { BarTooltip } from '../bar/bar-tooltip';
import { BarValues } from '../bar/bar-values';
import { ECOption } from '../types/ec-option';
import { ComboAxes } from './combo-axes';
import { ComboChart } from './combo-chart';
import { ComboChartResolver } from './combo-chart-resolver';
import { ComboLayout } from './combo-layout';
import { ComboMarks } from './combo-marks';
import { ComboSeriesOptions } from './combo-series-options';

/**
 * Combination chart: the bar chart's data, with each series drawn as bars or a line and
 * optionally on its own value axis.
 */
export class ComboOption {
  /** Null until there's a dataset and a category column bound. */
  public static build(
    config: ComboChartWidgetConfig,
    data: BarChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    const chart = ComboChartResolver.resolve(config, data, columns, colors);
    if (!chart) return null;

    const yAxes = ComboAxes.values(chart);
    return {
      grid: ComboLayout.grid(chart),
      tooltip: ComboOption.tooltip(chart),
      ...ComboLayout.legend(chart),
      ...ComboLayout.dataZoom(chart),
      xAxis: ComboAxes.category(chart),
      yAxis: chart.multiAxis ? yAxes : yAxes[0],
      series: [...ComboSeriesOptions.all(chart), ...ComboMarks.references(chart)],
    };
  }

  private static tooltip(chart: ComboChart) {
    const seriesByName = new Map(
      chart.series.map((s) => [BarValues.seriesName(s.result, chart.config.title), s.result]),
    );
    return {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      appendToBody: true,
      confine: true,
      formatter: (raw: unknown) => BarTooltip.format(raw, seriesByName, chart.seriesConfigs, false),
    };
  }
}

import { DatasetColumn } from '../../../../../../core/models/dataset';
import { BarChartWidgetConfig } from '../../../../../../core/models/report';
import { BarChartQueryResult } from '../../../../../../core/models/widget-query';
import { ECOption } from '../types/ec-option';
import { BarAxes } from './bar-axes';
import { BarChart } from './bar-chart';
import { BarChartResolver } from './bar-chart-resolver';
import { BarLayout } from './bar-layout';
import { BarMarks } from './bar-marks';
import { BarSeriesOptions } from './bar-series-options';
import { BarTooltip } from './bar-tooltip';
import { BarSeriesName } from './values/bar-series-name';

/** Bar chart: one aggregated value per category, per series. */
export class BarOption {
  /** Null until there's a dataset and a category column bound. */
  public static build(
    config: BarChartWidgetConfig,
    data: BarChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    const chart = BarChartResolver.resolve(config, data, columns, colors);
    if (!chart) return null;

    const categoryAxis = BarAxes.category(chart);
    const valueAxis = BarAxes.value(chart);
    const reference = BarMarks.reference(chart);
    return {
      grid: BarLayout.grid(chart),
      tooltip: BarOption.tooltip(chart),
      ...BarLayout.legend(chart),
      ...BarLayout.dataZoom(chart),
      xAxis: chart.horizontal ? valueAxis : categoryAxis,
      yAxis: chart.horizontal ? categoryAxis : valueAxis,
      series: [
        ...BarSeriesOptions.data(chart),
        ...BarSeriesOptions.totals(chart),
        ...(reference ? [reference] : []),
      ],
    };
  }

  private static tooltip(chart: BarChart) {
    const seriesByName = new Map(
      chart.series.map((s) => [BarSeriesName.of(s, chart.config.title), s]),
    );
    return {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      appendToBody: true,
      confine: true,
      formatter: (raw: unknown) =>
        BarTooltip.format(raw, seriesByName, chart.seriesConfigs, chart.percent),
    };
  }
}

import { DatasetColumn } from '../../../../../../core/models/dataset';
import { HistogramWidgetConfig } from '../../../../../../core/models/report';
import { HistogramQueryResult } from '../../../../../../core/models/widget-query';
import { ChartLegend } from '../layout/chart-legend';
import { GroupingGrid } from '../layout/grouping-grid';
import { ECOption } from '../types/ec-option';
import { HistogramAxes } from './histogram-axes';
import { HistogramChartResolver } from './histogram-chart-resolver';
import { HistogramMarks } from './histogram-marks';
import { HistogramNormalCurve } from './histogram-normal-curve';
import { HistogramSeriesOptions } from './histogram-series-options';
import { HistogramTooltip } from './histogram-tooltip';

/**
 * Histogram: one bar per value bin, per series. Spec bands are mapped to fractional bin positions
 * on a hidden value axis laid over the bin axis.
 */
export class HistogramOption {
  /** Null until there's a dataset and a value column bound. */
  public static build(
    config: HistogramWidgetConfig,
    data: HistogramQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    const chart = HistogramChartResolver.resolve(config, data, columns, colors);
    if (!chart) {
      return null;
    }

    const binAxes = [HistogramAxes.bin(chart), HistogramAxes.position(chart)];
    const countAxis = HistogramAxes.count(chart);
    const reference = HistogramMarks.reference(chart);
    return {
      grid: GroupingGrid.build(false, chart.horizontal, chart.showLegend),
      tooltip: HistogramTooltip.option(chart),
      ...ChartLegend.of(
        chart.showLegend,
        chart.series.map((s) => s.name),
      ),
      xAxis: chart.horizontal ? countAxis : binAxes,
      yAxis: chart.horizontal ? binAxes : countAxis,
      series: [
        ...HistogramSeriesOptions.all(chart),
        ...HistogramNormalCurve.series(chart),
        ...(reference ? [reference] : []),
      ],
    };
  }
}

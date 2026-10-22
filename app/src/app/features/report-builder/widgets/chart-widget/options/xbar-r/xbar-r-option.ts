import { DatasetColumn } from '../../../../../../core/models/dataset';
import { XBarRChartWidgetConfig } from '../../../../../../core/models/report';
import { XBarRChartQueryResult } from '../../../../../../core/models/widget-query';
import { CategoryZoom } from '../axes/category-zoom';
import { ECOption } from '../types/ec-option';
import { XBarRAxes } from './xbar-r-axes';
import { XBarRChart } from './xbar-r-chart';
import { XBarRChartResolver } from './xbar-r-chart-resolver';
import { XBarRMarks } from './xbar-r-marks';
import { XBarRSeriesOptions } from './xbar-r-series-options';

/**
 * Xbar-R chart: the X-bar chart above the R chart on a shared subgroup axis. Limits are step-line
 * series because they vary per subgroup when subgroup sizes differ.
 */
export class XBarROption {
  /** Null until there's a dataset and both a subgroup and a value column bound. */
  public static build(
    config: XBarRChartWidgetConfig,
    data: XBarRChartQueryResult | null,
    columns: DatasetColumn[],
  ): ECOption | null {
    const chart = XBarRChartResolver.resolve(config, data, columns);
    if (!chart) {
      return null;
    }
    return chart.attribute ? XBarROption.single(chart) : XBarROption.paired(chart);
  }

  /** An attribute chart (p, np): one grid. */
  private static single(chart: XBarRChart): ECOption {
    const reference = XBarRMarks.reference(chart);
    return {
      grid: { left: 56, right: 20, top: 30, bottom: chart.zoom ? 76 : 56, containLabel: true },
      xAxis: XBarRAxes.labelledCategory(chart),
      yAxis: XBarRAxes.mean(chart),
      tooltip: XBarROption.tooltip(),
      ...(chart.zoom ? { dataZoom: CategoryZoom.dataZoom(false) } : {}),
      series: [...XBarRSeriesOptions.mean(chart), ...(reference ? [reference] : [])],
    };
  }

  /** The value chart above its dispersion chart; one slider pans both. */
  private static paired(chart: XBarRChart): ECOption {
    const reference = XBarRMarks.reference(chart);
    return {
      grid: [
        { left: 56, right: 20, top: 30, height: '36%', containLabel: true },
        { left: 56, right: 20, top: '60%', bottom: chart.zoom ? 76 : 56, containLabel: true },
      ],
      xAxis: [XBarRAxes.hiddenCategory(chart), XBarRAxes.labelledCategory(chart)],
      yAxis: [XBarRAxes.mean(chart), XBarRAxes.range(chart)],
      tooltip: XBarROption.tooltip(),
      ...(chart.zoom
        ? {
            dataZoom: [
              { type: 'inside' as const, xAxisIndex: [0, 1] },
              { type: 'slider' as const, xAxisIndex: [0, 1], height: 20, bottom: 12 },
            ],
          }
        : {}),
      series: [
        ...XBarRSeriesOptions.mean(chart),
        ...XBarRSeriesOptions.range(chart),
        ...(reference ? [reference] : []),
      ],
    };
  }

  /** Each series carries its own formatter. */
  private static tooltip() {
    return { trigger: 'item' as const, appendToBody: true, confine: true };
  }
}

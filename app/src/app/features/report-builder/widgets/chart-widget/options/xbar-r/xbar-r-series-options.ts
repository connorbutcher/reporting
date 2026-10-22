import type { LineSeriesOption } from 'echarts/charts';
import { XBarRSubgroup } from '../../../../../../core/models/widget-query';
import { XBarRChart } from './xbar-r-chart';
import { XBarRColors } from './xbar-r-colors';
import { XBarRTooltip } from './xbar-r-tooltip';

/** Each chart's plotted line with its control limits and centre line. */
export class XBarRSeriesOptions {
  /** The top chart, on grid 0. */
  public static mean(chart: XBarRChart): LineSeriesOption[] {
    const { names, highlight } = chart;
    const context = XBarRTooltip.context(chart, 'mean');
    return [
      {
        ...XBarRSeriesOptions.valueLine(names.value, 0),
        data: chart.subgroups.map((s) => ({
          value: s.mean,
          ...(highlight && s.meanOutOfControl ? XBarRColors.OUT_OF_CONTROL_POINT : {}),
        })),
        tooltip: { formatter: (p) => XBarRTooltip.format(p, context) },
      },
      ...XBarRSeriesOptions.limit(chart, names.meanChart, 'xBarUcl', 0),
      ...XBarRSeriesOptions.limit(chart, names.meanChart, 'xBarLcl', 0),
      XBarRSeriesOptions.center(chart, names.meanChart, chart.data?.xBarCenterLine ?? 0, 0),
    ];
  }

  /** The bottom chart, on grid 1. */
  public static range(chart: XBarRChart): LineSeriesOption[] {
    const { names, highlight } = chart;
    const context = XBarRTooltip.context(chart, 'range');
    return [
      {
        ...XBarRSeriesOptions.valueLine(names.dispersion, 1),
        // A subgroup of one has no range: leave a gap rather than plot 0.
        data: chart.subgroups.map((s) => ({
          value: s.hasRange === false ? null : s.range,
          ...(highlight && s.rangeOutOfControl ? XBarRColors.OUT_OF_CONTROL_POINT : {}),
        })),
        tooltip: { formatter: (p) => XBarRTooltip.format(p, context) },
      },
      ...XBarRSeriesOptions.limit(chart, names.dispersionChart, 'rUcl', 1),
      ...XBarRSeriesOptions.limit(chart, names.dispersionChart, 'rLcl', 1),
      XBarRSeriesOptions.center(chart, names.dispersionChart, chart.data?.rCenterLine ?? 0, 1),
    ];
  }

  private static valueLine(name: string, grid: number): LineSeriesOption {
    return {
      name,
      type: 'line',
      xAxisIndex: grid,
      yAxisIndex: grid,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: XBarRColors.IN_CONTROL, width: 1.5 },
      itemStyle: { color: XBarRColors.IN_CONTROL },
    };
  }

  /** A flat line, stepped when subgroup sizes differ. */
  private static limit(
    chart: XBarRChart,
    chartName: string,
    field: keyof Pick<XBarRSubgroup, 'xBarUcl' | 'xBarLcl' | 'rUcl' | 'rLcl'>,
    grid: number,
  ): LineSeriesOption[] {
    if (chart.categories.length === 0) {
      return [];
    }
    const label = field.endsWith('Ucl') ? 'UCL' : 'LCL';
    return [
      {
        name: `${chartName} ${label}`,
        type: 'line',
        xAxisIndex: grid,
        yAxisIndex: grid,
        step: 'middle',
        symbol: 'none',
        silent: true,
        tooltip: { show: false },
        lineStyle: { color: XBarRColors.LIMIT_LINE, type: 'dashed', width: 1.25 },
        endLabel: { show: true, formatter: label, color: XBarRColors.LIMIT_LINE, fontSize: 10 },
        data: chart.subgroups.map((s) => s[field]),
      },
    ];
  }

  private static center(
    chart: XBarRChart,
    chartName: string,
    value: number,
    grid: number,
  ): LineSeriesOption {
    return {
      name: `${chartName} CL`,
      type: 'line',
      xAxisIndex: grid,
      yAxisIndex: grid,
      symbol: 'none',
      silent: true,
      tooltip: { show: false },
      lineStyle: { color: XBarRColors.CENTER_LINE, width: 1.25 },
      endLabel: { show: true, formatter: 'CL', color: XBarRColors.CENTER_LINE, fontSize: 10 },
      data: new Array(chart.categories.length).fill(value),
    };
  }
}

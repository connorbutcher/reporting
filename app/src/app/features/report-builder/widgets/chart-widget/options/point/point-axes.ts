import type { YAXisComponentOption } from 'echarts';
import { ChartValueAxis } from '../../../../../../core/models/report';
import { ChartSeriesResult } from '../../../../../../core/models/widget-query';
import { ChartScale } from '../axes/chart-scale';
import { ValueExtent } from '../axes/value-extent';
import { ChartFormat } from '../format/chart-format';
import { PointChart } from './point-chart';
import { PointChartConstants } from './point-chart-constants';

/** A point chart's shared X axis and one Y axis per configured axis. */
export class PointAxes {
  public static x(chart: PointChart) {
    const { config, xIsText } = chart;
    const scale = PointAxes.xScale(chart);
    const rotate = ChartScale.labelRotate(config.xAxisRotate);
    const longest = xIsText
      ? ChartScale.longestLen(chart.xCategories ?? [])
      : ValueExtent.labelLength(
          chart.series.flatMap((s) => s.points.map((p) => p.x)),
          chart.formatX,
        );
    return {
      ...scale,
      ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
      name: chart.xLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(longest, rotate, 'x'),
      splitLine: { show: (config.showGridLines ?? true) && !xIsText },
    };
  }

  /**
   * The primary's type comes from its column; a secondary's is inferred from its values.
   * Secondary axes are offset per side.
   */
  public static y(chart: PointChart): YAXisComponentOption[] {
    const sideOrder: Record<'left' | 'right', number> = { left: 0, right: 0 };
    return chart.axes.map((axis, k) => PointAxes.yAxis(chart, axis, k, sideOrder[axis.side]++));
  }

  /** A text axis's categories, in first-appearance order (the server already applied the sort). */
  public static categories(series: ChartSeriesResult[], axis: 'x' | 'y'): string[] {
    const values = new Set<string>();
    for (const s of series) {
      for (const point of s.points) values.add(String(axis === 'x' ? point.x : point.y));
    }
    return [...values];
  }

  private static xScale(chart: PointChart) {
    const { config } = chart;
    if (chart.xIsDate) return ChartScale.dateAxis(chart.xDateConfig);
    if (chart.xIsText)
      return ChartScale.categoryAxis(chart.xCategories ?? [], config.xAxisInterval);
    return ChartScale.numericAxis(
      config.xLogScale,
      config.xAxisMin,
      config.xAxisMax,
      config.xAxisInterval,
      chart.xConfig,
      config.xAxisScale,
    );
  }

  private static yAxis(
    chart: PointChart,
    axis: ChartValueAxis,
    index: number,
    orderOnSide: number,
  ): YAXisComponentOption {
    const isPrimary = index === 0;
    const axisSeries = chart.series.filter((_, i) => chart.seriesAxisIndex[i] === index);
    const isDate = isPrimary && chart.yPrimaryIsDate;
    const isText = isPrimary ? chart.yPrimaryIsText : PointAxes.firstPointIsText(axisSeries);
    const categories = isText ? PointAxes.categories(axisSeries, 'y') : null;
    const numericConfig = isPrimary ? chart.yConfig : undefined;
    const color = PointAxes.color(chart, index);
    const scale = isDate
      ? ChartScale.dateAxis(chart.yDateConfig)
      : isText
        ? ChartScale.categoryAxis(categories ?? [], axis.interval)
        : ChartScale.numericAxis(
            axis.logScale,
            axis.min,
            axis.max,
            axis.interval,
            numericConfig,
            axis.scale,
          );
    const rotate = ChartScale.labelRotate(axis.rotate);
    const longest = isText
      ? ChartScale.longestLen(categories ?? [])
      : ValueExtent.labelLength(
          axisSeries.flatMap((s) => s.points.map((p) => p.y)),
          isDate
            ? (v) => ChartFormat.date(v, chart.yDateConfig)
            : (v) => ChartFormat.numeric(v, numericConfig),
        );
    return {
      ...scale,
      ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
      name: isPrimary ? chart.yLabel : axis.label.trim(),
      nameLocation: 'middle',
      nameGap: ChartScale.nameGap(longest, rotate, 'y'),
      ...(color ? { nameTextStyle: { color } } : {}),
      position: axis.side,
      ...(orderOnSide > 0 ? { offset: orderOnSide * PointChartConstants.AXIS_OFFSET } : {}),
      ...(!isPrimary || color
        ? { axisLine: { show: true, ...(color ? { lineStyle: { color } } : {}) } }
        : {}),
      // Gridlines ride the primary only, so stacked scales don't compete.
      splitLine: { show: isPrimary && (chart.config.showGridLines ?? true) },
    };
  }

  /** An axis carrying a single series is drawn in its colour, so readers can match them. */
  private static color(chart: PointChart, index: number): string | null {
    if (!chart.multiAxis) return null;
    const onAxis = chart.seriesAxisIndex.flatMap((k, i) => (k === index ? [i] : []));
    return onAxis.length === 1 ? chart.seriesColors[onAxis[0]] : null;
  }

  private static firstPointIsText(seriesForAxis: ChartSeriesResult[]): boolean {
    for (const s of seriesForAxis) {
      const p = s.points[0];
      if (p) return typeof p.y === 'string';
    }
    return false;
  }
}

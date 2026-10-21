import type { YAXisComponentOption } from 'echarts';
import { ChartValueAxis } from '../../../../../../../core/models/report';
import { ChartSeriesResult } from '../../../../../../../core/models/widget-query';
import { ChartScale } from '../../axes/chart-scale';
import { SideAxes } from '../../axes/side-axes';
import { ValueExtent } from '../../axes/value-extent';
import { ChartFormat } from '../../format/chart-format';
import { PointChart } from '../point-chart';
import { PointYAxisShape } from '../types/point-y-axis-shape';
import { PointCategories } from './point-categories';

/**
 * One Y axis per configured axis. The primary's type comes from its column; a secondary's is
 * inferred from its values. Secondary axes are offset per side.
 */
export class PointYAxis {
  public static all(chart: PointChart): YAXisComponentOption[] {
    const order = SideAxes.orderOnSide(chart.axes);
    return chart.axes.map((axis, k) => PointYAxis.build(chart, axis, k, order[k]));
  }

  private static build(
    chart: PointChart,
    axis: ChartValueAxis,
    index: number,
    orderOnSide: number,
  ): YAXisComponentOption {
    const shape = PointYAxis.shape(chart, index);
    const scale = PointYAxis.scale(chart, axis, shape);
    const rotate = ChartScale.labelRotate(axis.rotate);
    const color = PointYAxis.color(chart, index);
    return {
      ...scale,
      ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
      name: shape.isPrimary ? chart.yLabel : axis.label.trim(),
      nameLocation: 'middle',
      nameGap: ChartScale.nameGap(PointYAxis.longestLabel(chart, shape), rotate, 'y'),
      ...SideAxes.placement(axis, shape.isPrimary, color, orderOnSide),
      // Gridlines ride the primary only, so stacked scales don't compete.
      splitLine: { show: shape.isPrimary && (chart.config.showGridLines ?? true) },
    };
  }

  private static shape(chart: PointChart, index: number): PointYAxisShape {
    const isPrimary = index === 0;
    const series = chart.series.filter((_, i) => chart.seriesAxisIndex[i] === index);
    const isText = isPrimary ? chart.yPrimaryIsText : PointYAxis.firstPointIsText(series);
    return {
      isPrimary,
      isDate: isPrimary && chart.yPrimaryIsDate,
      isText,
      series,
      categories: isText ? PointCategories.of(series, 'y') : null,
      numericConfig: isPrimary ? chart.yConfig : undefined,
    };
  }

  private static scale(chart: PointChart, axis: ChartValueAxis, shape: PointYAxisShape) {
    if (shape.isDate) return ChartScale.dateAxis(chart.yDateConfig);
    if (shape.isText) return ChartScale.categoryAxis(shape.categories ?? [], axis.interval);
    return ChartScale.numericAxis(
      axis.logScale,
      axis.min,
      axis.max,
      axis.interval,
      shape.numericConfig,
      axis.scale,
    );
  }

  private static longestLabel(chart: PointChart, shape: PointYAxisShape): number {
    if (shape.isText) return ChartScale.longestLen(shape.categories ?? []);
    return ValueExtent.labelLength(
      shape.series.flatMap((s) => s.points.map((p) => p.y)),
      shape.isDate
        ? (v) => ChartFormat.date(v, chart.yDateConfig)
        : (v) => ChartFormat.numeric(v, shape.numericConfig),
    );
  }

  /** An axis carrying a single series is drawn in its colour, so readers can match them. */
  private static color(chart: PointChart, index: number): string | null {
    if (!chart.multiAxis) return null;
    const onAxis = chart.seriesAxisIndex.flatMap((k, i) => (k === index ? [i] : []));
    return onAxis.length === 1 ? chart.seriesColors[onAxis[0]] : null;
  }

  private static firstPointIsText(series: readonly ChartSeriesResult[]): boolean {
    const first = series.find((s) => s.points.length > 0)?.points[0];
    return first ? typeof first.y === 'string' : false;
  }
}

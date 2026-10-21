import type { YAXisComponentOption } from 'echarts';
import { ChartValueAxis } from '../../../../../../core/models/report';
import { ChartScale } from '../axes/chart-scale';
import { ValueExtent } from '../axes/value-extent';
import { BarValues } from '../bar/bar-values';
import { ChartFormat } from '../format/chart-format';
import { PointChartConstants } from '../point/point-chart-constants';
import { ComboChart } from './combo-chart';

/** The shared category axis and one value axis per configured Y axis. */
export class ComboAxes {
  public static category(chart: ComboChart) {
    const { config, categories } = chart;
    // Tilt long category lists unless the user picked an orientation.
    const autoRotate = categories.length > 6 ? 30 : 0;
    const rotate = ChartScale.labelRotate(config.xAxisRotate, autoRotate);
    const scale = ChartScale.categoryAxis(categories, config.xAxisInterval);
    return {
      ...scale,
      name: config.xAxisLabel.trim() || chart.categoryColumn.name,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(ChartScale.longestLen(categories), rotate, 'x'),
      axisLabel: { ...scale.axisLabel, rotate },
    };
  }

  /** Secondary axes are offset per side; gridlines ride the primary only. */
  public static values(chart: ComboChart): YAXisComponentOption[] {
    const sideOrder: Record<'left' | 'right', number> = { left: 0, right: 0 };
    return chart.axes.map((axis, k) => ComboAxes.value(chart, axis, k, sideOrder[axis.side]++));
  }

  private static value(
    chart: ComboChart,
    axis: ChartValueAxis,
    index: number,
    orderOnSide: number,
  ): YAXisComponentOption {
    const isPrimary = index === 0;
    const numericConfig = isPrimary ? chart.valueConfig : undefined;
    const color = ComboAxes.color(chart, index);
    const scale = ChartScale.numericAxis(
      axis.logScale,
      axis.min,
      axis.max,
      axis.interval,
      numericConfig,
      axis.scale,
    );
    const rotate = ChartScale.labelRotate(axis.rotate);
    const labelLen = ValueExtent.labelLength(
      chart.series.filter((s) => s.axisIndex === index).flatMap((s) => s.result.values),
      (v) => ChartFormat.numeric(v, numericConfig),
    );
    return {
      ...scale,
      ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
      name: isPrimary ? ComboAxes.primaryName(chart) : axis.label.trim(),
      nameLocation: 'middle',
      nameGap: ChartScale.nameGap(labelLen, rotate, 'y'),
      ...(color ? { nameTextStyle: { color } } : {}),
      position: axis.side,
      ...(orderOnSide > 0 ? { offset: orderOnSide * PointChartConstants.AXIS_OFFSET } : {}),
      ...(!isPrimary || color
        ? { axisLine: { show: true, ...(color ? { lineStyle: { color } } : {}) } }
        : {}),
      splitLine: { show: isPrimary && (chart.config.showGridLines ?? true) },
    };
  }

  /** An axis carrying a single series is drawn in its colour, so readers can match them. */
  private static color(chart: ComboChart, index: number): string | null {
    if (!chart.multiAxis) return null;
    const onAxis = chart.series.filter((s) => s.axisIndex === index);
    return onAxis.length === 1 ? onAxis[0].color : null;
  }

  private static primaryName(chart: ComboChart): string {
    return (
      chart.axes[0].label.trim() ||
      BarValues.measureLabel(chart.config.aggregate, chart.valueColumn?.name ?? null)
    );
  }
}

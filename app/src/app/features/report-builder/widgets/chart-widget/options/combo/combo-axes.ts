import type { YAXisComponentOption } from 'echarts';
import { ChartValueAxis } from '../../../../../../core/models/report';
import { CategoryAxis } from '../axes/category-axis';
import { ChartScale } from '../axes/chart-scale';
import { ValueExtent } from '../axes/value-extent';
import { ChartFormat } from '../format/chart-format';
import { SideAxes } from '../axes/side-axes';
import { ComboChart } from './combo-chart';
import { BarMeasureLabel } from '../bar/values/bar-measure-label';

/** The shared category axis and one value axis per configured Y axis. */
export class ComboAxes {
  public static category(chart: ComboChart) {
    const name = chart.config.xAxisLabel.trim() || chart.categoryColumn.name;
    return CategoryAxis.build(chart.categories, chart.config, name, false);
  }

  /** Secondary axes are offset per side; gridlines ride the primary only. */
  public static values(chart: ComboChart): YAXisComponentOption[] {
    const order = SideAxes.orderOnSide(chart.axes);
    return chart.axes.map((axis, k) => ComboAxes.value(chart, axis, k, order[k]));
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
      ...SideAxes.placement(axis, isPrimary, color, orderOnSide),
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
      BarMeasureLabel.of(chart.config.aggregate, chart.valueColumn?.name ?? null)
    );
  }
}

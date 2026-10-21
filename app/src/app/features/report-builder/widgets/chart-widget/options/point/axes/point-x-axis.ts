import { ChartScale } from '../../axes/chart-scale';
import { ValueExtent } from '../../axes/value-extent';
import { PointChart } from '../point-chart';

/** A point chart's shared X axis: a date, category or numeric scale. */
export class PointXAxis {
  public static build(chart: PointChart) {
    const { config, xIsText } = chart;
    const scale = PointXAxis.scale(chart);
    const rotate = ChartScale.labelRotate(config.xAxisRotate);
    return {
      ...scale,
      ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
      name: chart.xLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(PointXAxis.longestLabel(chart), rotate, 'x'),
      splitLine: { show: (config.showGridLines ?? true) && !xIsText },
    };
  }

  private static scale(chart: PointChart) {
    const { config } = chart;
    if (chart.xIsDate) return ChartScale.dateAxis(chart.xDateConfig);
    if (chart.xIsText) return ChartScale.categoryAxis(chart.xCategories ?? [], config.xAxisInterval);
    return ChartScale.numericAxis(
      config.xLogScale,
      config.xAxisMin,
      config.xAxisMax,
      config.xAxisInterval,
      chart.xConfig,
      config.xAxisScale,
    );
  }

  private static longestLabel(chart: PointChart): number {
    if (chart.xIsText) return ChartScale.longestLen(chart.xCategories ?? []);
    return ValueExtent.labelLength(
      chart.series.flatMap((s) => s.points.map((p) => p.x)),
      chart.formatX,
    );
  }
}

import { ChartScale } from '../axes/chart-scale';
import { ValueExtent } from '../axes/value-extent';
import { ChartFormat } from '../format/chart-format';
import { XBarRChart } from './xbar-r-chart';

/** The shared subgroup axis (labelled under the bottom grid) and each chart's value axis. */
export class XBarRAxes {
  /** The top grid's subgroup axis, unlabelled since the bottom one carries the labels. */
  public static hiddenCategory(chart: XBarRChart) {
    return {
      ...ChartScale.categoryAxis(chart.categories, chart.config.xAxisInterval),
      gridIndex: 0,
    };
  }

  public static labelledCategory(chart: XBarRChart) {
    const { config, categories } = chart;
    const rotate = ChartScale.labelRotate(
      config.xAxisRotate,
      ChartScale.autoCategoryRotate(categories, false),
    );
    return {
      ...ChartScale.categoryAxis(categories, config.xAxisInterval),
      ...(rotate !== 0 ? { axisLabel: { rotate } } : {}),
      gridIndex: chart.attribute ? 0 : 1,
      name: config.xAxisLabel.trim() || chart.categoryColumn.name,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(ChartScale.longestLen(categories), rotate, 'x'),
    };
  }

  /** Fits the data rather than anchoring at zero, since measurements are rarely near it. */
  public static mean(chart: XBarRChart) {
    const { mode, meanAxisConfig: axis } = chart;
    const scale = ChartScale.numericAxis(
      false,
      axis.min,
      axis.max,
      axis.interval,
      chart.valueConfig,
      true,
    );
    const labelLen =
      mode === 'p'
        ? 6
        : XBarRAxes.labelLen(
            chart.subgroups.flatMap((s) => [s.mean, s.xBarUcl, s.xBarLcl]),
            chart,
          );
    return {
      ...scale,
      ...(mode === 'p'
        ? { axisLabel: { formatter: (v: number | string) => chart.formatMean(Number(v)) } }
        : {}),
      gridIndex: 0,
      name: axis.label.trim() || (chart.attribute ? chart.names.value : chart.valueColumn.name),
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(labelLen, 0, 'y'),
      splitLine: { show: chart.config.showGridLines ?? true },
    };
  }

  /** A range is never negative, so this axis keeps its zero floor. */
  public static range(chart: XBarRChart) {
    const scale = ChartScale.numericAxis(false, null, null, null, chart.valueConfig, false);
    const labelLen = XBarRAxes.labelLen(
      chart.subgroups.flatMap((s) => (s.hasRange === false ? [s.rUcl] : [s.range, s.rUcl])),
      chart,
    );
    return {
      ...scale,
      gridIndex: 1,
      name: chart.names.dispersion,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(labelLen, 0, 'y'),
      splitLine: { show: chart.config.showGridLines ?? true },
    };
  }

  private static labelLen(values: number[], chart: XBarRChart): number {
    return ValueExtent.labelLength(values, (v) => ChartFormat.numeric(v, chart.valueConfig));
  }
}

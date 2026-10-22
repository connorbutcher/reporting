import { CategoryAxis } from '../axes/category-axis';
import { ChartScale } from '../axes/chart-scale';
import { ValueExtent } from '../axes/value-extent';
import { HistogramChart } from './histogram-chart';
import { HistogramCounts } from './histogram-counts';

/** The bin and count axes of a histogram, on X or Y depending on orientation. */
export class HistogramAxes {
  public static bin(chart: HistogramChart) {
    const name = chart.config.xAxisLabel.trim() || chart.valueColumn.name;
    return CategoryAxis.build(chart.binLabels, chart.config, name, chart.horizontal);
  }

  /**
   * A hidden value axis over the bin axis, from the first bin's left edge to the last's right.
   * echarts snaps marks on a category axis to the nearest bar centre, so the limits, which fall
   * anywhere across a bin, are drawn on this one instead.
   */
  public static position(chart: HistogramChart) {
    return {
      type: 'value' as const,
      min: -0.5,
      max: chart.bins.length - 0.5,
      show: false,
      ...(chart.horizontal ? { inverse: true } : {}),
    };
  }

  public static count(chart: HistogramChart) {
    const { config, countAxisConfig: axis } = chart;
    const scale = ChartScale.numericAxis(false, null, null, axis.interval, undefined, axis.scale);
    const rotate = ChartScale.labelRotate(axis.rotate);
    return {
      ...scale,
      axisLabel: {
        ...scale.axisLabel,
        formatter: (value: number | string) =>
          typeof value === 'number'
            ? HistogramCounts.format(value, config.normalize)
            : String(value),
        ...(rotate !== 0 ? { rotate } : {}),
      },
      name: axis.label.trim() || HistogramCounts.axisName(config.normalize),
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(
        HistogramAxes.countLabelLen(chart),
        rotate,
        chart.horizontal ? 'x' : 'y',
      ),
      splitLine: { show: config.showGridLines ?? true },
      // Otherwise it sits at the position axis's zero, the first bar's centre.
      axisLine: { onZero: false },
    };
  }

  /** The tallest bar's formatted height, to size the count axis name gap. */
  private static countLabelLen(chart: HistogramChart): number {
    const extent = ValueExtent.of(chart.series.flatMap((s) => s.result.values));
    return extent ? HistogramCounts.format(extent.max, chart.config.normalize).length : 0;
  }
}

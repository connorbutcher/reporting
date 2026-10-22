import type { LineSeriesOption } from 'echarts/charts';
import { HistogramNormalize } from '../../../../../../core/models/report';
import { HistogramBin } from '../../../../../../core/models/widget-query';
import { HistogramChart } from './histogram-chart';
import { HistogramSeries } from './histogram-series';

/** A fitted normal curve per distribution, on the same scale as its bars. */
export class HistogramNormalCurve {
  /** A cumulative chart has no bell to fit. */
  public static series(chart: HistogramChart): LineSeriesOption[] {
    const { config } = chart;
    if (!config.showNormalCurve || config.cumulative) {
      return [];
    }
    return chart.series.flatMap((s, i) => {
      const values = HistogramNormalCurve.values(s.result, chart.bins, config.normalize);
      return values ? [HistogramNormalCurve.line(s, i, values)] : [];
    });
  }

  /**
   * The curve at each bin centre: count = n·w·pdf, frequency = w·pdf, density = pdf. Null without
   * stats, spread or bin width.
   */
  public static values(
    series: { mean?: number; stdDev?: number; count?: number },
    bins: HistogramBin[],
    normalize: HistogramNormalize,
  ): number[] | null {
    const { mean, stdDev, count } = series;
    if (mean == null || stdDev == null || !(stdDev > 0) || bins.length === 0) {
      return null;
    }
    const width = bins[0].upper - bins[0].lower;
    if (!(width > 0)) {
      return null;
    }
    const scale =
      normalize === 'density' ? 1 : normalize === 'frequency' ? width : (count ?? 0) * width;
    return bins.map((bin) => {
      const z = ((bin.lower + bin.upper) / 2 - mean) / stdDev;
      return (scale * Math.exp(-0.5 * z * z)) / (stdDev * Math.sqrt(2 * Math.PI));
    });
  }

  private static line(s: HistogramSeries, index: number, values: number[]): LineSeriesOption {
    return {
      name: s.name,
      id: `normal:${index}`,
      type: 'line' as const,
      smooth: true,
      symbol: 'none',
      silent: true,
      tooltip: { show: false },
      lineStyle: { color: s.color, width: 2, type: 'dashed' as const },
      itemStyle: { color: s.color },
      z: 3,
      data: values,
    };
  }
}

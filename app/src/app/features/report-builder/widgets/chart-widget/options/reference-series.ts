import type { LineSeriesOption } from 'echarts/charts';
import { MarkAreaData } from './types/mark-area-data';
import { MarkLineData } from './types/mark-line-data';

/**
 * The series a chart's reference lines and shaded zones (tolerance bands, guide lines) hang on.
 *
 * ECharts draws a `markLine`/`markArea` as part of a series, and hides it when that series is toggled
 * off in the legend. Hung on a data series, every reference line vanished as soon as the reader hid
 * that series. Instead they ride an empty, unnamed line series of their own, which the legend never
 * lists (each chart's legend names its data series explicitly) and so can never be hidden.
 */
export class ReferenceSeries {
  /** The series name the reference carrier uses — never shown, and never in a legend's data. */
  public static readonly NAME = '​reference';

  /**
   * A carrier for `marks` and `areas`, plotted against the given axes (by index, for multi-axis and
   * multi-grid charts); null when there's nothing to draw.
   */
  public static build(
    marks: MarkLineData,
    areas: MarkAreaData,
    axes: { xAxisIndex?: number; yAxisIndex?: number } = {},
  ): LineSeriesOption | null {
    if (marks.length === 0 && areas.length === 0) return null;
    return {
      type: 'line',
      name: ReferenceSeries.NAME,
      data: [],
      silent: true,
      symbol: 'none',
      legendHoverLink: false,
      tooltip: { show: false },
      ...(axes.xAxisIndex != null ? { xAxisIndex: axes.xAxisIndex } : {}),
      ...(axes.yAxisIndex != null ? { yAxisIndex: axes.yAxisIndex } : {}),
      ...(marks.length > 0 ? { markLine: { silent: true, symbol: 'none', data: marks } } : {}),
      ...(areas.length > 0 ? { markArea: { silent: true, data: areas } } : {}),
    };
  }
}

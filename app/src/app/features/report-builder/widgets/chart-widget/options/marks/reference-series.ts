import type { LineSeriesOption } from 'echarts/charts';
import { MarkAreaData } from './types/mark-area-data';
import { MarkLineData } from './types/mark-line-data';

/**
 * An empty, unnamed carrier series for reference lines and zones. echarts hides marks with their
 * series, so hanging them on a data series made them vanish when it was toggled off.
 */
export class ReferenceSeries {
  public static readonly NAME = '​reference';

  /** A carrier on the given axis indexes, or null when there's nothing to draw. */
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

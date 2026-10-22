import type { EffectScatterSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import { PointChartConstants } from '../point-chart-constants';
import { ChartCommentAnchor } from '../types/chart-comment-anchor';

/**
 * Pin markers for anchored comments. All share one series name, so clicks are unambiguous and
 * legend toggles never hide them.
 */
export class CommentMarkers {
  private static readonly COLOR = '#152a55';

  /** One pin series per Y axis that has anchors. */
  public static pins(
    anchors: readonly ChartCommentAnchor[],
    multiAxis: boolean,
    axisCount: number,
  ): ScatterSeriesOption[] {
    const byAxis = CommentMarkers.groupByAxis(anchors, axisCount);
    return [...byAxis.entries()].map(([axisK, group]) => ({
      type: 'scatter' as const,
      name: PointChartConstants.COMMENT_ANCHOR_SERIES_NAME,
      data: group.map((anchor) => ({ value: [anchor.x, anchor.y] as [number, number], anchor })),
      symbol: 'pin',
      symbolSize: 26,
      itemStyle: { color: CommentMarkers.COLOR },
      legendHoverLink: false,
      tooltip: { formatter: () => 'Click to view this comment' },
      z: 10,
      ...(multiAxis ? { yAxisIndex: axisK } : {}),
    }));
  }

  /** A rippling halo at the highlighted comment's point, or none when it isn't on this widget. */
  public static highlight(
    point: ChartCommentAnchor | null,
    multiAxis: boolean,
    axisCount: number,
  ): EffectScatterSeriesOption[] {
    if (!point) {
      return [];
    }
    return [
      {
        type: 'effectScatter',
        name: PointChartConstants.COMMENT_ANCHOR_SERIES_NAME,
        data: [[point.x, point.y]],
        symbolSize: 30,
        itemStyle: { color: CommentMarkers.COLOR, opacity: 0.35 },
        rippleEffect: { scale: 3, brushType: 'stroke' },
        silent: true,
        z: 9,
        ...(multiAxis ? { yAxisIndex: CommentMarkers.axisOf(point, axisCount) } : {}),
      },
    ];
  }

  private static groupByAxis(
    anchors: readonly ChartCommentAnchor[],
    axisCount: number,
  ): Map<number, ChartCommentAnchor[]> {
    const byAxis = new Map<number, ChartCommentAnchor[]>();
    for (const anchor of anchors) {
      const axisK = CommentMarkers.axisOf(anchor, axisCount);
      byAxis.set(axisK, [...(byAxis.get(axisK) ?? []), anchor]);
    }
    return byAxis;
  }

  private static axisOf(anchor: ChartCommentAnchor, axisCount: number): number {
    return Math.min(Math.max(anchor.yAxisIndex ?? 0, 0), axisCount - 1);
  }
}

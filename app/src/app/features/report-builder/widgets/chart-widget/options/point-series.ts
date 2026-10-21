import { ChartSeriesResult } from '../../../../../core/models/widget-query';
import type {
  EffectScatterSeriesOption,
  LineSeriesOption,
  ScatterSeriesOption,
} from 'echarts/charts';
import { PointSeriesOption } from './types/point-series-option';
import { OutlineSeverity } from './outline-severity';
import { COMMENT_ANCHOR_SERIES_NAME } from './point-types';
import { ChartCommentAnchor } from './types/chart-comment-anchor';
import { Coord } from './types/coord';
import { PointChartConfig } from './types/point-chart-config';
import { ScatterPoint } from './types/scatter-point';
import { SeriesStyle } from './types/series-style';
import { SizeScale } from './types/size-scale';

/** The fixed colour every comment-anchor marker draws in — distinct from any series' own palette colour. */
const ANCHOR_COLOR = '#152a55';

/** The per-kind echarts series options and the plotted points for a point chart. */
export class PointSeries {
  /**
   * The echarts series options specific to one point-chart kind — its type and per-kind styling.
   * Name, colour, data and mark lines are shared by the caller. `sizeScale`, when a scatter series
   * has at least one bound bubble size, maps each point's raw size value to its marker's pixel
   * diameter; null/omitted keeps every marker at the chart's fixed `pointSize` (unbound, or a line
   * chart, where a varying marker size over a connected line reads poorly).
   */
  public static kindOptions(
    config: PointChartConfig,
    color: string,
    style: SeriesStyle,
    sizeScale?: SizeScale | null,
  ): PointSeriesOption {
    // A per-binding symbol override wins over the kind's default marker; 'none' hides it.
    const symbol = style.symbol;
    switch (config.type) {
      case 'lineChart':
        return {
          type: 'line',
          smooth: config.smooth,
          showSymbol: symbol ? symbol !== 'none' : config.showPoints,
          symbol: symbol && symbol !== 'none' ? symbol : 'circle',
          symbolSize: config.pointSize,
          // LTTB thins a dense line to ~one point per pixel column while keeping its shape.
          sampling: 'lttb',
          ...(style.dashStyle && style.dashStyle !== 'solid'
            ? { lineStyle: { type: style.dashStyle } }
            : {}),
          ...(config.areaFill ? { areaStyle: { opacity: 0.15, color } } : {}),
        };
      case 'scatterChart':
        // `large` switches scatter to a batched renderer past the threshold. 'none' is ignored —
        // scatter has no line to fall back on, so honouring it would blank the series.
        return {
          type: 'scatter',
          ...(symbol && symbol !== 'none' ? { symbol } : {}),
          symbolSize: sizeScale
            ? (_value: unknown, params: unknown) =>
                sizeScale((params as { data?: ScatterPoint }).data?.size)
            : config.pointSize,
          large: true,
          largeThreshold: 2000,
        };
    }
  }

  /**
   * A dashed overlay fitting {@link ChartSeriesResult.trendLine}, drawn in the series' own colour
   * so it reads as "that series, straightened out". Null when the series has no fit — the trend
   * toggle is off, the axes aren't both numeric, or there weren't enough points. Shares `mainName`
   * with the series it fits (the caller's main series `name`, already in `legend.data`) rather than
   * a name of its own, so toggling that legend entry hides the trend line along with its series
   * instead of leaving it stranded on screen. Its fit stats (slope and R²) are always shown at the
   * line's end, rather than only on hover, so the numbers are readable at a glance; hovering
   * anywhere on the line shows the same text.
   */
  public static trendLine(
    series: ChartSeriesResult,
    mainName: string,
    color: string,
    yAxisIndex: number | null,
    xIsDate = false,
  ): LineSeriesOption | null {
    const trend = series.trendLine;
    if (!trend) return null;

    const stats = PointSeries.trendStatsText(trend, xIsDate);

    return {
      type: 'line',
      name: mainName,
      data: [
        [trend.x1, trend.y1],
        [trend.x2, trend.y2],
      ],
      showSymbol: false,
      symbol: 'none',
      legendHoverLink: false,
      lineStyle: { type: 'dashed', color, width: 1.5 },
      endLabel: {
        show: true,
        formatter: () => stats,
        color,
        fontSize: 11,
        distance: 6,
      },
      tooltip: {
        formatter: () => stats,
      },
      ...(yAxisIndex !== null ? { yAxisIndex } : {}),
    };
  }

  /**
   * The fit stats text drawn at a trend line's end and on its hover tooltip. On a date X the fit runs
   * on epoch milliseconds, so the slope is rescaled to per day (per month over long spans) and says so.
   * The slope keeps three significant figures, so a small but real trend never prints as 0.00.
   */
  public static trendStatsText(
    trend: NonNullable<ChartSeriesResult['trendLine']>,
    xIsDate = false,
  ): string {
    let slope = trend.slope;
    let unit = '';
    if (xIsDate) {
      const day = 86_400_000;
      const perMonth = Math.abs(trend.x2 - trend.x1) > 2 * 365 * day;
      slope *= perMonth ? 30.4375 * day : day;
      unit = perMonth ? ' / month' : ' / day';
    }
    return `Slope: ${PointSeries.significant(slope)}${unit} · R²: ${trend.rSquared.toFixed(2)}`;
  }

  /**
   * One pin-shaped marker per widget comment anchored to this chart, grouped into a series per Y
   * axis (most charts need only one). Shares {@link COMMENT_ANCHOR_SERIES_NAME} across every group
   * rather than each series' own name, so clicking one is unambiguous in the chart's click handler
   * and so toggling a data series off in the legend never hides a comment pinned near it — the two
   * are independent. Kept off the legend the same way a trend line is.
   */
  public static anchorMarkers(
    anchors: readonly ChartCommentAnchor[],
    multiAxis: boolean,
    axisCount: number,
  ): ScatterSeriesOption[] {
    if (anchors.length === 0) return [];

    const byAxis = new Map<number, ChartCommentAnchor[]>();
    for (const anchor of anchors) {
      const axisK = Math.min(Math.max(anchor.yAxisIndex ?? 0, 0), axisCount - 1);
      const group = byAxis.get(axisK);
      if (group) group.push(anchor);
      else byAxis.set(axisK, [anchor]);
    }

    return [...byAxis.entries()].map(([axisK, group]) => ({
      type: 'scatter' as const,
      name: COMMENT_ANCHOR_SERIES_NAME,
      data: group.map((anchor) => ({ value: [anchor.x, anchor.y] as [number, number], anchor })),
      symbol: 'pin',
      symbolSize: 26,
      itemStyle: { color: ANCHOR_COLOR },
      legendHoverLink: false,
      tooltip: { formatter: () => 'Click to view this comment' },
      z: 10,
      ...(multiAxis ? { yAxisIndex: axisK } : {}),
    }));
  }

  /**
   * A rippling halo drawn at a comment's point, so clicking its marker — or its chip in the
   * comments panel — actually draws the eye there rather than just opening the thread and leaving
   * the reader to hunt for which point it was. `null` when nothing is currently highlighted, or the
   * highlighted anchor belongs to a different widget (the caller already filtered for that, but
   * stays defensive here since a stray cross-widget value would otherwise silently misplace a ring).
   */
  public static highlightMarker(
    point: ChartCommentAnchor | null,
    multiAxis: boolean,
    axisCount: number,
  ): EffectScatterSeriesOption[] {
    if (!point) return [];
    const axisK = Math.min(Math.max(point.yAxisIndex ?? 0, 0), axisCount - 1);
    return [
      {
        type: 'effectScatter',
        name: COMMENT_ANCHOR_SERIES_NAME,
        data: [[point.x, point.y]],
        symbolSize: 30,
        itemStyle: { color: ANCHOR_COLOR, opacity: 0.35 },
        rippleEffect: { scale: 3, brushType: 'stroke' },
        silent: true,
        z: 9,
        ...(multiAxis ? { yAxisIndex: axisK } : {}),
      },
    ];
  }

  /**
   * The pixel width to reserve on the chart's trailing edge so a trend line's end-of-line stats
   * text (drawn just past its last point, in the direction the grid's right margin already backs
   * onto) stays inside the canvas instead of getting clipped at its edge. 0 when no series has a
   * fit. Estimated from the widest stats string across every series, same approach as
   * {@link ChartScale.nameGap} for axis names — echarts can't size this itself since it lays the
   * label out after the grid rect is fixed.
   */
  public static trendLabelReserve(series: readonly ChartSeriesResult[], xIsDate = false): number {
    const CHAR_W = 6.5; // ~px per char at the endLabel's 11px font (proportional; erring wide)
    const DISTANCE = 6; // the endLabel's own `distance` from its point
    const MARGIN = 10; // breathing room past the text
    let maxLen = 0;
    for (const s of series) {
      if (!s.trendLine) continue;
      const len = PointSeries.trendStatsText(s.trendLine, xIsDate).length;
      if (len > maxLen) maxLen = len;
    }
    return maxLen === 0 ? 0 : Math.round(maxLen * CHAR_W + DISTANCE + MARGIN);
  }

  public static points(
    series: ChartSeriesResult,
    color: string,
    outlineColor: (x: Coord, y: Coord) => string | null,
  ): ScatterPoint[] {
    return series.points.map((p) => {
      const border = outlineColor(p.x, p.y);
      return {
        value: [p.x, p.y],
        tooltipLines: p.tooltipLines,
        size: p.size,
        // An outlined point also turns into a triangle, so its status isn't carried by colour alone.
        ...(border
          ? { symbol: 'triangle', itemStyle: OutlineSeverity.itemStyle(color, border) }
          : {}),
      };
    });
  }

  private static significant(value: number): string {
    if (value === 0 || !Number.isFinite(value)) return '0';
    return Number(value.toPrecision(3)).toLocaleString('en-US', { maximumFractionDigits: 10 });
  }
}

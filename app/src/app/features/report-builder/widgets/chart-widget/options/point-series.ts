import { ChartSeriesResult } from '../../../../../core/models/widget-query';
import type {
  EffectScatterSeriesOption,
  LineSeriesOption,
  ScatterSeriesOption,
} from 'echarts/charts';
import { PointSeriesOption } from './types/point-series-option';
import { OutlineSeverity } from './outline-severity';
import { PointChartConstants } from './point-chart-constants';
import { ChartCommentAnchor } from './types/chart-comment-anchor';
import { Coord } from './types/coord';
import { PointChartConfig } from './types/point-chart-config';
import { ScatterPoint } from './types/scatter-point';
import { SeriesStyle } from './types/series-style';
import { SizeScale } from './types/size-scale';

export class PointSeries {
  private static readonly ANCHOR_COLOR = '#152a55';

  /** The per-kind series options; `sizeScale` maps a scatter point's size value to its diameter. */
  public static kindOptions(
    config: PointChartConfig,
    color: string,
    style: SeriesStyle,
    sizeScale?: SizeScale | null,
  ): PointSeriesOption {
    const symbol = style.symbol;
    switch (config.type) {
      case 'lineChart':
        return {
          type: 'line',
          smooth: config.smooth,
          showSymbol: symbol ? symbol !== 'none' : config.showPoints,
          symbol: symbol && symbol !== 'none' ? symbol : 'circle',
          symbolSize: config.pointSize,
          // LTTB thins a dense line to about one point per pixel column, keeping its shape.
          sampling: 'lttb',
          ...(style.dashStyle && style.dashStyle !== 'solid'
            ? { lineStyle: { type: style.dashStyle } }
            : {}),
          ...(config.areaFill ? { areaStyle: { opacity: 0.15, color } } : {}),
        };
      case 'scatterChart':
        // 'none' is ignored: scatter has no line to fall back on.
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
   * A dashed trend line in the series' colour, with its slope and R² shown at the line's end.
   * Shares `mainName` so it toggles with its series. Null when the series has no fit.
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
   * The trend stats text. On a date X the slope is rescaled from epoch millis to per day (or per
   * month over long spans), to three significant figures.
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
   * One pin marker per anchored comment, grouped per Y axis. All share one series name, so clicks
   * are unambiguous and legend toggles never hide them.
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
      name: PointChartConstants.COMMENT_ANCHOR_SERIES_NAME,
      data: group.map((anchor) => ({ value: [anchor.x, anchor.y] as [number, number], anchor })),
      symbol: 'pin',
      symbolSize: 26,
      itemStyle: { color: PointSeries.ANCHOR_COLOR },
      legendHoverLink: false,
      tooltip: { formatter: () => 'Click to view this comment' },
      z: 10,
      ...(multiAxis ? { yAxisIndex: axisK } : {}),
    }));
  }

  /** A rippling halo at the highlighted comment's point, or null when none is on this widget. */
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
        name: PointChartConstants.COMMENT_ANCHOR_SERIES_NAME,
        data: [[point.x, point.y]],
        symbolSize: 30,
        itemStyle: { color: PointSeries.ANCHOR_COLOR, opacity: 0.35 },
        rippleEffect: { scale: 3, brushType: 'stroke' },
        silent: true,
        z: 9,
        ...(multiAxis ? { yAxisIndex: axisK } : {}),
      },
    ];
  }

  /**
   * The right-edge width to reserve so trend stats text isn't clipped; echarts lays the label out
   * after fixing the grid, so it can't size this itself.
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
        // Outlined points also become triangles, so status isn't carried by colour alone.
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

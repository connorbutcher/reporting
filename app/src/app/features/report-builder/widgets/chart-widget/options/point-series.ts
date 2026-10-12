import { ChartSeriesResult } from '../../../../../core/models/widget-query';
import { LineSeriesOption, PointSeriesOption } from './chart-option.types';
import { ToleranceOutline } from './tolerance-outline';
import { Coord, PointChartConfig, ScatterPoint, SeriesStyle, SizeScale } from './point-types';

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
   * toggle is off, the axes aren't both numeric, or there weren't enough points. Kept out of the
   * legend (the caller doesn't add its name to `legend.data`). Its fit stats (slope and R²) are
   * always shown at the line's end, rather than only on hover, so the numbers are readable at a
   * glance; hovering anywhere on the line shows the same text.
   */
  public static trendLine(series: ChartSeriesResult, color: string, yAxisIndex: number | null): LineSeriesOption | null {
    const trend = series.trendLine;
    if (!trend) return null;

    const stats = `Slope: ${trend.slope.toFixed(2)} · R²: ${trend.rSquared.toFixed(2)}`;

    return {
      type: 'line',
      name: series.label ? `${series.label} (trend)` : 'Trend',
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
        ...(border ? { itemStyle: ToleranceOutline.itemStyle(color, border) } : {}),
      };
    });
  }
}

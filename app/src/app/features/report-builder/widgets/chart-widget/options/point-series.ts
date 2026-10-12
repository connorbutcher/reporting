import { ChartSeriesResult } from '../../../../../core/models/widget-query';
import { LineSeriesOption, PointSeriesOption } from './chart-option.types';
import { ToleranceOutline } from './tolerance-outline';
import { Coord, PointChartConfig, ScatterPoint, SeriesStyle } from './point-types';

/** The per-kind echarts series options and the plotted points for a point chart. */
export class PointSeries {
  /**
   * The echarts series options specific to one point-chart kind — its type and per-kind styling.
   * Name, colour, data and mark lines are shared by the caller.
   */
  public static kindOptions(config: PointChartConfig, color: string, style: SeriesStyle): PointSeriesOption {
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
          symbolSize: config.pointSize,
          large: true,
          largeThreshold: 2000,
        };
    }
  }

  /**
   * A dashed overlay fitting {@link ChartSeriesResult.trendLine}, drawn in the series' own colour
   * so it reads as "that series, straightened out". Null when the series has no fit — the trend
   * toggle is off, the axes aren't both numeric, or there weren't enough points. Kept out of the
   * legend (the caller doesn't add its name to `legend.data`); hovering it shows the fit's R²
   * instead of a point's X/Y, since it isn't one of the plotted rows.
   */
  public static trendLine(series: ChartSeriesResult, color: string, yAxisIndex: number | null): LineSeriesOption | null {
    const trend = series.trendLine;
    if (!trend) return null;

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
      tooltip: {
        formatter: () => `R² = ${trend.rSquared.toFixed(3)}`,
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
        ...(border ? { itemStyle: ToleranceOutline.itemStyle(color, border) } : {}),
      };
    });
  }
}

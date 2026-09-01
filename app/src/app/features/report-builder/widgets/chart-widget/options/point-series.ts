import { ChartSeriesResult } from '../../../../../core/models/widget-query';
import { PointSeriesOption } from './chart-option.types';
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

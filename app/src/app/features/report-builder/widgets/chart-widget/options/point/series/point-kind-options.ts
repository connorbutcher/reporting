import {
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
} from '../../../../../../../core/models/report';
import { PointChartConfig } from '../types/point-chart-config';
import { PointSeriesOption } from '../types/point-series-option';
import { ScatterPoint } from '../types/scatter-point';
import { SeriesStyle } from '../types/series-style';
import { SizeScale } from '../types/size-scale';

/** The series options that differ between a line and a scatter chart. */
export class PointKindOptions {
  /** `sizeScale` maps a scatter point's size value to its diameter. */
  public static of(
    config: PointChartConfig,
    color: string,
    style: SeriesStyle,
    sizeScale?: SizeScale | null,
  ): PointSeriesOption {
    return config.type === 'lineChart'
      ? PointKindOptions.line(config, color, style)
      : PointKindOptions.scatter(config, style, sizeScale);
  }

  private static line(
    config: LineChartWidgetConfig,
    color: string,
    style: SeriesStyle,
  ): PointSeriesOption {
    const symbol = style.symbol;
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
  }

  /** 'none' is ignored: scatter has no line to fall back on. */
  private static scatter(
    config: ScatterChartWidgetConfig,
    style: SeriesStyle,
    sizeScale?: SizeScale | null,
  ): PointSeriesOption {
    const symbol = style.symbol;
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

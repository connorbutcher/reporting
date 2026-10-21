import { ChartZoomMemory } from '../../chart-zoom';
import { ChartLegend } from '../layout/chart-legend';
import { PointChart } from './point-chart';
import { PointChartConstants } from './point-chart-constants';
import { PointSeries } from './point-series';

/** A point chart's grid margins, legend, colour scale and zoom. */
export class PointLayout {
  // Colourblind-safe blue→red ramp (RdYlBu, reversed) for colour-by-value.
  private static readonly VALUE_COLOR_SCALE = [
    '#2c7bb6',
    '#abd9e9',
    '#ffffbf',
    '#fdae61',
    '#d7191c',
  ];

  /** Extra Y axes widen their side; trend stats text needs room past the last point. */
  public static grid(chart: PointChart) {
    const { axes, config } = chart;
    const leftCount = axes.filter((a) => a.side === 'left').length;
    const rightCount = axes.filter((a) => a.side === 'right').length;
    const trendReserve = config.showTrendLine
      ? PointSeries.trendLabelReserve(chart.series, chart.xIsDate)
      : 0;
    return {
      left: 56 + Math.max(0, leftCount - 1) * PointChartConstants.AXIS_OFFSET,
      right: 20 + rightCount * PointChartConstants.AXIS_OFFSET + trendReserve,
      // The legend and the colour scale share the top strip.
      top: chart.showLegend || chart.colorByValue ? 40 : 20,
      bottom: chart.zoom ? 76 : 48,
      containLabel: true,
      // Keep axis names on-canvas too; echarts shrinks the plot instead of clipping.
      outerBoundsContain: 'all' as const,
    };
  }

  public static legend(chart: PointChart) {
    return ChartLegend.of(
      chart.showLegend,
      chart.series.map((s) => s.label),
    );
  }

  /** Colours marks by their Y value on a continuous scale, shown as a bar up top. */
  public static visualMap(chart: PointChart) {
    const extent = chart.yExtent;
    if (!chart.colorByValue || !extent) return {};
    return {
      visualMap: {
        type: 'continuous' as const,
        min: extent.min,
        max: extent.max,
        dimension: 1,
        calculable: true,
        orient: 'horizontal' as const,
        left: 'center',
        top: 0,
        text: [chart.formatYPrimary(extent.max), chart.formatYPrimary(extent.min)],
        inRange: { color: PointLayout.VALUE_COLOR_SCALE },
      },
    };
  }

  /** Wheel/drag zoom: a slider and inside zoom along X, and inside zoom along Y when enabled. */
  public static dataZoom(chart: PointChart) {
    const zoomY = chart.config.zoomY;
    if (!chart.zoom && !zoomY) return {};
    return {
      dataZoom: [
        ...(chart.zoom
          ? [
              { type: 'inside' as const, xAxisIndex: 0 },
              { type: 'slider' as const, xAxisIndex: 0, height: 20, bottom: 12 },
            ]
          : []),
        ...(zoomY
          ? [{ type: 'inside' as const, yAxisIndex: 0, id: ChartZoomMemory.VALUE_ZOOM_ID }]
          : []),
      ],
    };
  }
}

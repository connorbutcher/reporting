import type { LineSeriesOption } from 'echarts/charts';
import { ChartSeriesResult } from '../../../../../../../core/models/widget-query';
import { LabelCallbackParams } from '../../types/label-callback-params';
import { PointChart } from '../point-chart';
import { PointMarks } from '../point-marks';
import { PointData } from './point-data';
import { PointKindOptions } from './point-kind-options';
import { TrendLineSeries } from './trend-line-series';
import { Coord } from '../types/coord';

/** Each result series as its plotted points, plus its trend line when enabled. */
export class PointDataSeries {
  public static all(chart: PointChart) {
    return chart.series.flatMap((s, i) => {
      const name = s.label || chart.config.title || 'Series';
      const main = PointDataSeries.main(chart, s, i, name);
      const trend = PointDataSeries.trend(chart, s, i, name);
      return trend ? [main, trend] : [main];
    });
  }

  private static main(chart: PointChart, s: ChartSeriesResult, index: number, name: string) {
    const { config, colorByValue } = chart;
    const color = chart.seriesColors[index];
    const axisIndex = chart.seriesAxisIndex[index];
    const yAxisIndex = PointDataSeries.yAxisIndex(chart, index);
    return {
      name,
      ...PointKindOptions.of(config, color, chart.seriesStyles[index], chart.sizeScale),
      // The visualMap drives the fill under colour-by-value.
      ...(colorByValue ? {} : { itemStyle: { color } }),
      data: PointData.points(s, color, PointMarks.outlineColor(chart, axisIndex)),
      ...(config.showValueLabels ? { label: PointDataSeries.valueLabel(chart, axisIndex) } : {}),
      ...(yAxisIndex !== null ? { yAxisIndex } : {}),
    };
  }

  /** Shares the main series' name, so it has no legend entry but toggles with its series. */
  private static trend(
    chart: PointChart,
    s: ChartSeriesResult,
    index: number,
    mainName: string,
  ): LineSeriesOption | null {
    if (!chart.config.showTrendLine) {
      return null;
    }
    return TrendLineSeries.series(
      s,
      mainName,
      chart.seriesColors[index],
      PointDataSeries.yAxisIndex(chart, index),
      chart.xIsDate,
    );
  }

  private static valueLabel(chart: PointChart, axisIndex: number) {
    const formatY = axisIndex === 0 ? chart.formatYPrimary : chart.formatYOther;
    return {
      show: true,
      position: 'top' as const,
      formatter: (p: LabelCallbackParams) => formatY((p.value as [Coord, Coord])[1]),
    };
  }

  private static yAxisIndex(chart: PointChart, index: number): number | null {
    if (!chart.multiAxis) {
      return null;
    }
    return Math.min(chart.seriesAxisIndex[index], chart.axes.length - 1);
  }
}

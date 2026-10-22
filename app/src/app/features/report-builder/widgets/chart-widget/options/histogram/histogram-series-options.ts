import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import { LabelCallbackParams } from '../types/label-callback-params';
import { HistogramChart } from './histogram-chart';
import { HistogramCounts } from './histogram-counts';
import { HistogramSeries } from './histogram-series';

/** Each distribution as bars, or as a step line when cumulative. */
export class HistogramSeriesOptions {
  public static all(chart: HistogramChart): (BarSeriesOption | LineSeriesOption)[] {
    return chart.series.map((s) =>
      chart.config.cumulative
        ? HistogramSeriesOptions.cumulative(chart, s)
        : HistogramSeriesOptions.bars(chart, s),
    );
  }

  /** A cumulative distribution reads as a rising step line. */
  private static cumulative(chart: HistogramChart, s: HistogramSeries): LineSeriesOption {
    return {
      name: s.name,
      type: 'line',
      step: 'end',
      symbol: 'none',
      lineStyle: { color: s.color, width: 2 },
      itemStyle: { color: s.color },
      areaStyle: chart.series.length === 1 ? { color: s.color, opacity: 0.12 } : undefined,
      data: s.result.values,
      ...HistogramSeriesOptions.valueLabel(chart),
    };
  }

  /** A single distribution's bars butt together to read as continuous. */
  private static bars(chart: HistogramChart, s: HistogramSeries): BarSeriesOption {
    return {
      name: s.name,
      type: 'bar',
      barCategoryGap: chart.series.length > 1 ? '20%' : '0%',
      itemStyle: { color: s.color },
      data: s.result.values,
      ...HistogramSeriesOptions.valueLabel(chart),
    };
  }

  private static valueLabel(chart: HistogramChart) {
    if (!chart.config.showValueLabels) {
      return {};
    }
    return {
      label: {
        show: true,
        position: (chart.horizontal ? 'right' : 'top') as 'right' | 'top',
        formatter: (p: LabelCallbackParams) =>
          typeof p.value === 'number'
            ? HistogramCounts.format(p.value, chart.config.normalize)
            : '',
      },
    };
  }
}

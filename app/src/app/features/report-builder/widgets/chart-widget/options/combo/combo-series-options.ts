import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import { ChartFormat } from '../format/chart-format';
import { OutlineSeverity } from '../marks/outline-severity';
import { LabelCallbackParams } from '../types/label-callback-params';
import { ComboChart } from './combo-chart';
import { ComboMarks } from './combo-marks';
import { ComboSeries } from './combo-series';
import { BarSeriesName } from '../bar/values/bar-series-name';

/** Each combo series as an echarts bar or line series. */
export class ComboSeriesOptions {
  public static all(chart: ComboChart): (BarSeriesOption | LineSeriesOption)[] {
    return chart.series.map((s) =>
      s.renderAs === 'line' ? ComboSeriesOptions.line(chart, s) : ComboSeriesOptions.bar(chart, s),
    );
  }

  private static bar(chart: ComboChart, s: ComboSeries): BarSeriesOption {
    const outline = ComboMarks.outlineColor(chart, s.axisIndex);
    return {
      ...ComboSeriesOptions.base(chart, s),
      type: 'bar',
      // Stack per binding, so overlaid datasets stand side by side; lines never stack.
      ...(chart.config.stacked ? { stack: s.result.bindingId ?? 'total' } : {}),
      itemStyle: { color: s.color },
      data: s.result.values.map((v) => {
        const border = v !== null ? outline(v) : null;
        return border ? { value: v, itemStyle: OutlineSeverity.itemStyle(s.color, border) } : v;
      }),
    };
  }

  private static line(chart: ComboChart, s: ComboSeries): LineSeriesOption {
    const { config } = chart;
    // A binding's marker overrides the chart's "show points"; 'none' hides markers only.
    const symbol = s.symbol;
    return {
      ...ComboSeriesOptions.base(chart, s),
      type: 'line',
      smooth: config.smooth,
      itemStyle: { color: s.color },
      showSymbol: symbol ? symbol !== 'none' : config.showPoints,
      symbol: symbol && symbol !== 'none' ? symbol : 'circle',
      symbolSize: config.pointSize,
      lineStyle: {
        color: s.color,
        ...(s.dashStyle && s.dashStyle !== 'solid' ? { type: s.dashStyle } : {}),
      },
      ...(config.areaFill ? { areaStyle: { opacity: 0.15, color: s.color } } : {}),
      ...(config.connectNulls ? { connectNulls: true } : {}),
      data: s.result.values,
    };
  }

  /** The name, axis and value label shared by bar and line series. */
  private static base(chart: ComboChart, s: ComboSeries) {
    return {
      name: BarSeriesName.of(s.result, chart.config.title),
      ...(chart.multiAxis ? { yAxisIndex: Math.min(s.axisIndex, chart.axes.length - 1) } : {}),
      ...(chart.config.showValueLabels ? { label: ComboSeriesOptions.valueLabel(chart, s) } : {}),
    };
  }

  private static valueLabel(chart: ComboChart, s: ComboSeries) {
    const numericConfig = chart.seriesConfigs.get(s.result);
    return {
      show: true,
      position: 'top' as const,
      formatter: (p: LabelCallbackParams) =>
        typeof p.value === 'number' ? ChartFormat.numeric(p.value, numericConfig) : '',
    };
  }
}

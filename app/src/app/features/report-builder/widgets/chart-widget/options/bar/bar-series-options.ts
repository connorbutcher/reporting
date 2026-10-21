import type { BarSeriesOption } from 'echarts/charts';
import { BarSeriesResult } from '../../../../../../core/models/widget-query';
import { SeriesColors } from '../colors/series-colors';
import { ChartFormat } from '../format/chart-format';
import { OutlineSeverity } from '../marks/outline-severity';
import { LabelCallbackParams } from '../types/label-callback-params';
import { BarChart } from './bar-chart';
import { BarMarks } from './bar-marks';
import { BarValues } from './bar-values';

/** The echarts series of a bar chart: its data bars and optional stack totals. */
export class BarSeriesOptions {
  public static data(chart: BarChart): BarSeriesOption[] {
    const outlineColor = BarMarks.outlineColor(chart);
    return chart.series.map((s, i) => BarSeriesOptions.dataSeries(chart, s, i, outlineColor));
  }

  /** Stack totals ride an invisible zero-height bar on top of each stack. */
  public static totals(chart: BarChart): BarSeriesOption[] {
    if (!chart.config.showStackTotals || !chart.stacked || chart.percent) return [];
    return [...chart.stackTotals].map(([stack, totals]) => ({
      name: `${BarValues.TOTAL_PREFIX}${stack}`,
      type: 'bar',
      stack,
      silent: true,
      tooltip: { show: false },
      itemStyle: { color: 'transparent' },
      label: {
        show: true,
        position: chart.horizontal ? 'right' : 'top',
        fontWeight: 'bold',
        formatter: (p: LabelCallbackParams) => {
          const total = totals[p.dataIndex];
          return total ? ChartFormat.numeric(total, chart.valueConfig) : '';
        },
      },
      data: totals.map(() => 0),
    }));
  }

  private static dataSeries(
    chart: BarChart,
    s: BarSeriesResult,
    index: number,
    outlineColor: (value: number) => string | null,
  ): BarSeriesOption {
    const color = BarSeriesOptions.color(chart, s, index);
    return {
      name: BarValues.seriesName(s, chart.config.title),
      type: 'bar',
      // Stack per binding, so overlaid datasets stand as side-by-side stacks.
      ...(chart.stacked ? { stack: BarValues.stackOf(s) } : {}),
      itemStyle: { color },
      ...(chart.config.showValueLabels ? { label: BarSeriesOptions.valueLabel(chart, s) } : {}),
      data: BarValues.plotted(s, chart.percent, chart.stackTotals).map((v) => {
        const border = v !== null ? outlineColor(v) : null;
        return border ? { value: v, itemStyle: OutlineSeverity.itemStyle(color, border) } : v;
      }),
    };
  }

  /** A binding's colour override applies only while it yields a single series. */
  private static color(chart: BarChart, s: BarSeriesResult, index: number): string {
    const binding = s.bindingId ? chart.bindingsById.get(s.bindingId) : undefined;
    const seriesCount = s.bindingId
      ? (chart.seriesPerBinding.get(s.bindingId) ?? 1)
      : chart.series.length;
    const override = seriesCount === 1 ? (binding?.color ?? null) : null;
    return override ?? SeriesColors.forSeries(chart.colors, s.label, index);
  }

  private static valueLabel(chart: BarChart, s: BarSeriesResult) {
    const numericConfig = chart.seriesConfigs.get(s);
    return {
      show: true,
      position: chart.stacked ? 'inside' : chart.horizontal ? 'right' : 'top',
      formatter: (p: LabelCallbackParams) =>
        typeof p.value === 'number'
          ? BarValues.formatValue(p.value, chart.percent, numericConfig)
          : '',
    } as const;
  }
}

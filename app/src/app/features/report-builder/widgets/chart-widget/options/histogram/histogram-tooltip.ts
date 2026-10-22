import { TooltipHtml } from '../format/tooltip-html';
import { HistogramChart } from './histogram-chart';
import { HistogramCounts } from './histogram-counts';
import { HistogramTooltipParam } from './histogram-tooltip-param';

/** The axis tooltip: the bin, then each distribution's height and tooltip columns. */
export class HistogramTooltip {
  public static option(chart: HistogramChart) {
    return {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      appendToBody: true,
      confine: true,
      formatter: (raw: unknown) => HistogramTooltip.format(chart, raw),
    };
  }

  private static format(chart: HistogramChart, raw: unknown): string {
    const params = (Array.isArray(raw) ? raw : [raw]) as HistogramTooltipParam[];
    const index = params[0]?.dataIndex ?? -1;
    const lines = [`<strong>${TooltipHtml.escape(chart.binLabels[index] ?? '')}</strong>`];
    const names = chart.series.map((s) => s.name);
    for (const p of params) {
      const i = names.indexOf(p.seriesName ?? '');
      // The fitted curve has no tooltip of its own.
      if (i < 0 || typeof p.value !== 'number' || p.seriesId?.startsWith('normal:')) {
        continue;
      }
      lines.push(HistogramTooltip.seriesLine(chart, names[i], p.value, p.color));
      for (const line of chart.series[i].result.tooltipLines?.[p.dataIndex] ?? []) {
        lines.push(`&nbsp;&nbsp;&nbsp;${TooltipHtml.escape(line)}`);
      }
    }
    return lines.join('<br/>');
  }

  private static seriesLine(
    chart: HistogramChart,
    name: string,
    value: number,
    color: unknown,
  ): string {
    const marker = typeof color === 'string' ? TooltipHtml.marker(color) : '';
    const shown = HistogramCounts.format(value, chart.config.normalize);
    return `${marker}${TooltipHtml.escape(name)}: <strong>${shown}</strong>`;
  }
}

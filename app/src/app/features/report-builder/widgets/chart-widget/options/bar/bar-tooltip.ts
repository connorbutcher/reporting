import { NumericColumnConfig } from '../../../../../../core/models/dataset';
import { BarSeriesResult } from '../../../../../../core/models/widget-query';
import { ChartFormat } from '../format/chart-format';
import { TooltipHtml } from '../format/tooltip-html';
import { BarAxisTooltipParam } from './bar-axis-tooltip-param';
import { BarValues } from './bar-values';

/** The axis tooltip for bar and combo charts, hand-built so user-supplied text is escaped. */
export class BarTooltip {
  private static readonly INDENT = '&nbsp;&nbsp;&nbsp;';

  public static format(
    raw: unknown,
    seriesByName: Map<string, BarSeriesResult>,
    seriesConfigs: Map<BarSeriesResult, NumericColumnConfig | undefined>,
    percent: boolean,
  ): string {
    const params = (Array.isArray(raw) ? raw : [raw]) as BarAxisTooltipParam[];
    const lines: string[] = [];
    const header = params[0]?.axisValueLabel;
    if (header != null) lines.push(`<strong>${TooltipHtml.escape(header)}</strong>`);
    for (const p of params) {
      const s = p.seriesName != null ? seriesByName.get(p.seriesName) : undefined;
      const value = BarTooltip.valueOf(p);
      if (!s || typeof value !== 'number') continue;
      lines.push(BarTooltip.seriesLine(p, s, value, seriesConfigs.get(s), percent));
      lines.push(...BarTooltip.detailLines(s, p.dataIndex));
    }
    return lines.join('<br/>');
  }

  /** A data item is a plain number, or `{ value }` when outlined. */
  private static valueOf(p: BarAxisTooltipParam): unknown {
    return typeof p.value === 'number' ? p.value : (p.value as { value?: unknown } | null)?.value;
  }

  /** The series' value; a percentage also shows the raw value behind it. */
  private static seriesLine(
    p: BarAxisTooltipParam,
    s: BarSeriesResult,
    value: number,
    config: NumericColumnConfig | undefined,
    percent: boolean,
  ): string {
    const formatted = BarValues.formatValue(value, percent, config);
    const actual = s.values[p.dataIndex];
    const shown =
      percent && actual != null ? `${formatted} (${ChartFormat.numeric(actual)})` : formatted;
    const marker = typeof p.color === 'string' && p.color ? TooltipHtml.marker(p.color) : '';
    return `${marker}${TooltipHtml.escape(p.seriesName ?? '')}: <strong>${TooltipHtml.escape(shown)}</strong>`;
  }

  /** The rows behind the bar, then any tooltip columns. */
  private static detailLines(s: BarSeriesResult, dataIndex: number): string[] {
    const lines: string[] = [];
    const rows = s.rowCounts?.[dataIndex];
    if (rows != null) {
      const text = `${ChartFormat.numeric(rows)} ${rows === 1 ? 'row' : 'rows'}`;
      lines.push(`${BarTooltip.INDENT}${TooltipHtml.escape(text)}`);
    }
    for (const line of s.tooltipLines?.[dataIndex] ?? []) {
      lines.push(`${BarTooltip.INDENT}${TooltipHtml.escape(line)}`);
    }
    return lines;
  }
}

import { ChartFormat } from '../format/chart-format';
import { TooltipHtml } from '../format/tooltip-html';
import { TooltipCallbackParams } from '../types/tooltip-callback-params';
import { SubgroupTooltipContext } from './subgroup-tooltip-context';
import { XBarRChart } from './xbar-r-chart';

/** A point's tooltip: its value, that subgroup's own control limits and sample size. */
export class XBarRTooltip {
  private static readonly RULES: Record<number, string> = {
    1: 'beyond a control limit',
    2: '9 in a row on one side of the centre line',
    3: '6 in a row steadily rising or falling',
    4: '14 in a row alternating up and down',
    5: '2 of 3 beyond 2σ on one side',
  };

  public static context(chart: XBarRChart, kind: 'mean' | 'range'): SubgroupTooltipContext {
    const isMean = kind === 'mean';
    return {
      kind,
      valueLabel: isMean ? chart.names.value : chart.names.dispersion,
      categories: chart.categories,
      subgroups: chart.subgroups,
      format: isMean ? chart.formatMean : (v: number) => ChartFormat.numeric(v, chart.valueConfig),
      centerLine: (isMean ? chart.data?.xBarCenterLine : chart.data?.rCenterLine) ?? 0,
    };
  }

  public static format(params: TooltipCallbackParams, ctx: SubgroupTooltipContext): string {
    const param = Array.isArray(params) ? params[0] : params;
    const i = param.dataIndex;
    const s = ctx.subgroups[i];
    if (!s) {
      return '';
    }
    const isMean = ctx.kind === 'mean';
    if (!isMean && s.hasRange === false) {
      return '';
    }

    const num = ctx.format;
    const lines = [
      `<strong>${TooltipHtml.escape(ctx.categories[i] ?? '')}</strong>`,
      `${ctx.valueLabel}: ${num(isMean ? s.mean : s.range)}`,
      `UCL: ${num(isMean ? s.xBarUcl : s.rUcl)}`,
      `CL: ${num(ctx.centerLine)}`,
      `LCL: ${num(isMean ? s.xBarLcl : s.rLcl)}`,
      `n = ${s.count}`,
    ];
    if (isMean ? s.meanOutOfControl : s.rangeOutOfControl) {
      lines.push('<strong style="color:#dc2626">Out of control</strong>');
      const rules = (isMean ? s.meanRules : s.rangeRules) ?? [];
      for (const rule of rules) {
        lines.push(`Rule ${rule}: ${XBarRTooltip.RULES[rule] ?? ''}`);
      }
    }
    return lines.join('<br/>');
  }
}

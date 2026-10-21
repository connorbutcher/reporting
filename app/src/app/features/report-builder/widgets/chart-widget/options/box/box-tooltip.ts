import { Box } from '../../../../../../core/models/widget-query';
import { ChartFormat } from '../format/chart-format';
import { TooltipHtml } from '../format/tooltip-html';
import { TooltipCallbackParams } from '../types/tooltip-callback-params';
import { BoxCapability } from './box-capability';
import { BoxChart } from './box-chart';
import { BoxTooltipContext } from './box-tooltip-context';

/** The item tooltip: a box's summary, or an overlay point's value. */
export class BoxTooltip {
  public static option(chart: BoxChart) {
    const boxByKey = BoxTooltip.boxesByKey(chart);
    const context: BoxTooltipContext = {
      config: chart.valueConfig,
      horizontal: chart.horizontal,
      showMean: chart.config.showMean ?? false,
      showCapability: chart.config.showCapability ?? false,
      spec: BoxCapability.specBand(chart.data?.toleranceBands ?? []),
    };
    return {
      trigger: 'item' as const,
      appendToBody: true,
      confine: true,
      formatter: (params: TooltipCallbackParams) => BoxTooltip.format(params, boxByKey, context),
    };
  }

  private static format(
    params: TooltipCallbackParams,
    boxByKey: Map<string, Box>,
    ctx: BoxTooltipContext,
  ): string {
    const param = Array.isArray(params) ? params[0] : params;
    if (param.seriesType === 'boxplot') {
      const box = boxByKey.get(`${param.seriesName}#${param.dataIndex}`);
      return box ? BoxTooltip.boxSummary(param.seriesName, box, ctx) : '';
    }
    return BoxTooltip.overlayValue(param.value as [number, number], param.seriesId ?? '', ctx);
  }

  /** Keyed by "<series>#<category>", since echarts' boxplot value omits the mean, σ and count. */
  private static boxesByKey(chart: BoxChart): Map<string, Box> {
    const boxByKey = new Map<string, Box>();
    for (const { result, name } of chart.series) {
      result.boxes.forEach((box, i) => {
        if (box) boxByKey.set(`${name}#${i}`, box);
      });
    }
    return boxByKey;
  }

  /** The five-number summary and count, plus the mean, σ and Pp/Ppk when enabled. */
  private static boxSummary(
    seriesName: string | undefined,
    box: Box,
    ctx: BoxTooltipContext,
  ): string {
    const body = BoxTooltip.summaryRows(box, ctx)
      .map(([label, value]) => `${label}: ${ChartFormat.numeric(value, ctx.config)}`)
      .join('<br/>');
    const capability = ctx.showCapability ? BoxCapability.text(box, ctx.spec) : null;
    return (
      `<strong>${TooltipHtml.escape(seriesName || 'Box')}</strong><br/>${body}<br/>n = ${box.count}` +
      (capability ? `<br/>${capability}` : '') +
      (box.tooltipLines ?? []).map((line) => `<br/>${TooltipHtml.escape(line)}`).join('')
    );
  }

  private static summaryRows(box: Box, ctx: BoxTooltipContext): [label: string, value: number][] {
    const rows: [label: string, value: number][] = [
      ['Maximum', box.max],
      ['Upper quartile', box.q3],
      ['Median', box.median],
      ['Lower quartile', box.q1],
      ['Minimum', box.min],
    ];
    if (ctx.showMean || ctx.showCapability) rows.push(['Mean', box.mean], ['Std dev', box.stdDev]);
    return rows;
  }

  /** An overlay names itself through its series id; its value sits on the non-category axis. */
  private static overlayValue(
    value: [number, number],
    seriesId: string,
    ctx: BoxTooltipContext,
  ): string {
    const shown = ChartFormat.numeric(ctx.horizontal ? value[0] : value[1], ctx.config);
    if (seriesId.startsWith('mean:')) return `Mean: ${shown}`;
    if (seriesId.startsWith('outlier:')) return `Outlier: ${shown}`;
    return shown;
  }
}

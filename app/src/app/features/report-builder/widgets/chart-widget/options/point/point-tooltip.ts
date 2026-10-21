import { DateColumnConfig, NumericColumnConfig } from '../../../../../../core/models/dataset';
import { ChartFormat } from '../format/chart-format';
import { TooltipCallbackParams } from '../types/tooltip-callback-params';
import { PointChart } from './point-chart';
import { Coord } from './types/coord';
import { ScatterTooltipParams } from './types/scatter-tooltip-params';

/** The per-point tooltip and the axis value formatters it uses. */
export class PointTooltip {
  public static option(chart: PointChart) {
    return {
      trigger: 'item' as const,
      // The widget clips to rounded corners, so render the tooltip on <body> and confine it
      // to the viewport.
      appendToBody: true,
      confine: true,
      formatter: (raw: TooltipCallbackParams) => {
        const params = raw as unknown as ScatterTooltipParams;
        const onPrimary = (chart.seriesAxisIndex[params.seriesIndex] ?? 0) === 0;
        return PointTooltip.format(
          params,
          chart.showSeries,
          chart.xLabel,
          chart.yLabel,
          chart.formatX,
          onPrimary ? chart.formatYPrimary : chart.formatYOther,
        );
      },
    };
  }

  public static formatterFor(
    isText: boolean,
    isDate: boolean,
    numConfig: NumericColumnConfig | undefined,
    dateCfg: DateColumnConfig | undefined,
  ): (value: Coord) => string {
    if (isText) return (value) => String(value);
    if (isDate)
      return (value) =>
        typeof value === 'number' ? ChartFormat.date(value, dateCfg) : String(value);
    return (value) =>
      typeof value === 'number' ? ChartFormat.numeric(value, numConfig) : String(value);
  }

  public static format(
    params: ScatterTooltipParams,
    showSeries: boolean,
    xLabel: string,
    yLabel: string,
    formatX: (value: Coord) => string,
    formatY: (value: Coord) => string,
  ): string {
    return [
      ...(showSeries ? [params.seriesName] : []),
      `${xLabel}: ${formatX(params.value[0])}`,
      `${yLabel}: ${formatY(params.value[1])}`,
      ...params.data.tooltipLines,
    ].join('<br/>');
  }
}

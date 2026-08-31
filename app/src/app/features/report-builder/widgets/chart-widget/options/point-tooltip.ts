import { DateColumnConfig, NumericColumnConfig } from '../../../../../core/models/dataset';
import { ChartFormat } from './chart-format';
import { Coord, ScatterTooltipParams } from './point-types';

/** Builds the per-point tooltip for scatter/line charts and the per-axis value formatters it uses. */
export class PointTooltip {
  /** A value formatter for one axis: date, number, or passthrough by the axis kind. */
  public static formatterFor(
    isText: boolean,
    isDate: boolean,
    numConfig: NumericColumnConfig | undefined,
    dateCfg: DateColumnConfig | undefined,
  ): (value: Coord) => string {
    if (isText) return (value) => String(value);
    if (isDate) return (value) => (typeof value === 'number' ? ChartFormat.date(value, dateCfg) : String(value));
    return (value) => (typeof value === 'number' ? ChartFormat.numeric(value, numConfig) : String(value));
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

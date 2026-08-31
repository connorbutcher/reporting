import { DateColumnConfig, NumericColumnConfig } from '../../../../../core/models/dataset';
import { ChartFormat } from './chart-format';

/**
 * The scale-dependent echarts axis fields: axis `type` plus, for numeric axes, fixed
 * bounds and a number-formatting tick label. A text axis is a plain category axis (its
 * `data` is supplied by the caller, since X and Y source categories differently).
 */
export class ChartScale {
  /** A `time` axis whose ticks format through the column's date pattern. */
  public static dateAxis(config?: DateColumnConfig): object {
    return {
      type: 'time' as const,
      axisLabel: { formatter: (value: number) => ChartFormat.date(value, config) },
    };
  }

  public static numericAxis(
    isText: boolean,
    logScale: boolean | undefined,
    min: number | null | undefined,
    max: number | null | undefined,
    config: NumericColumnConfig | undefined,
  ): object {
    if (isText) return { type: 'category' as const };
    return {
      type: logScale ? ('log' as const) : ('value' as const),
      ...(min != null ? { min } : {}),
      ...(max != null ? { max } : {}),
      axisLabel: {
        formatter: (value: number | string) =>
          typeof value === 'number' ? ChartFormat.numeric(value, config) : String(value),
      },
    };
  }
}

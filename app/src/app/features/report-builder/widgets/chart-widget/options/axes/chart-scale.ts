import { DateColumnConfig, NumericColumnConfig } from '../../../../../../core/models/dataset';
import { AxisLabelRotation } from '../../../../../../core/models/report';
import { ChartFormat } from '../format/chart-format';
import { CategoryAxisFragment } from './types/category-axis-fragment';
import { DateAxisFragment } from './types/date-axis-fragment';
import { ValueAxisFragment } from './types/value-axis-fragment';

/**
 * Scale-dependent axis fragments. Each has a concrete `type` literal so the assembled axis
 * narrows to one echarts axis member.
 */
export class ChartScale {
  /** A `time` axis whose ticks format through the column's date pattern. */
  public static dateAxis(config?: DateColumnConfig): DateAxisFragment {
    return {
      type: 'time',
      axisLabel: { formatter: (value: number | string) => ChartFormat.date(Number(value), config) },
    };
  }

  /** A category axis; `interval` is echarts' label-skip count (0 shows every label, null auto-thins). */
  public static categoryAxis(data: string[], interval?: number | null): CategoryAxisFragment {
    return {
      type: 'category',
      data,
      ...(interval != null && interval >= 0 ? { axisLabel: { interval } } : {}),
    };
  }

  /** A value or log axis with optional bounds, tick interval, formatter and `scale`. */
  public static numericAxis(
    logScale: boolean | undefined,
    min: number | null | undefined,
    max: number | null | undefined,
    interval: number | null | undefined,
    config: NumericColumnConfig | undefined,
    scale?: boolean,
  ): ValueAxisFragment {
    return {
      // A log axis takes the same fields as a value axis, so only `type` is asserted.
      type: (logScale ? 'log' : 'value') as 'value',
      ...(min != null ? { min } : {}),
      ...(max != null ? { max } : {}),
      // A non-positive interval would make echarts lay out endless ticks.
      ...(interval != null && interval > 0 ? { interval } : {}),
      ...(scale ? { scale: true } : {}),
      axisLabel: {
        formatter: (value: number | string) =>
          typeof value === 'number' ? ChartFormat.numeric(value, config) : String(value),
      },
    };
  }

  /** Label orientation as echarts `axisLabel.rotate` degrees; unset falls back to auto. */
  public static labelRotate(rotation: AxisLabelRotation | null | undefined, auto = 0): number {
    if (rotation === 'vertical') return 90;
    if (rotation === 'horizontal') return 0;
    return auto;
  }

  public static longestLen(labels: readonly string[]): number {
    let n = 0;
    for (const s of labels) if (s.length > n) n = s.length;
    return n;
  }

  /**
   * A `nameGap` that clears the tick labels, estimated from the longest label, its rotation and the
   * axis orientation. Errs wide, since whitespace is harmless and overlap is not.
   */
  public static nameGap(longestChars: number, rotateDeg: number, axis: 'x' | 'y'): number {
    const CHAR_W = 7; // ~px per char at echarts' 12px default label font (proportional; erring wide)
    const LINE_H = 16; // ~px for one line of labels
    const LABEL_MARGIN = 8; // echarts axisLabel.margin default: axis line → label
    const GAP = 10; // breathing room between the labels and the name
    const width = longestChars * CHAR_W;
    const rad = (rotateDeg * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const extent = axis === 'x' ? width * sin + LINE_H * cos : width * cos + LINE_H * sin;
    const floor = axis === 'x' ? 24 : 22;
    return Math.round(Math.max(floor, LABEL_MARGIN + extent + GAP));
  }
}

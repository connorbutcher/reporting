import { DateColumnConfig, NumericColumnConfig } from '../../../../../core/models/dataset';
import { AxisLabelRotation } from '../../../../../core/models/report';
import { ChartFormat } from './chart-format';
import { CategoryAxisFragment, DateAxisFragment, ValueAxisFragment } from './chart-option.types';

/**
 * The scale-dependent echarts axis fields: axis `type` plus, for numeric axes, fixed
 * bounds and a number-formatting tick label. Each returns a single-scale fragment (its
 * `type` a concrete literal) so the caller's assembled axis narrows cleanly to one echarts
 * axis member. A category axis carries no `data` here — X and Y source categories
 * differently, so the caller passes it to {@link ChartScale.categoryAxis}.
 */
export class ChartScale {
  /** A `time` axis whose ticks format through the column's date pattern. */
  public static dateAxis(config?: DateColumnConfig): DateAxisFragment {
    return {
      type: 'time',
      axisLabel: { formatter: (value: number | string) => ChartFormat.date(Number(value), config) },
    };
  }

  /**
   * A category axis carrying the supplied labels. `interval` is the label-skip count echarts
   * applies to category labels — `0` forces every label to show, `1` every other, and so on;
   * null/undefined leaves echarts' own auto-thinning in place.
   */
  public static categoryAxis(data: string[], interval?: number | null): CategoryAxisFragment {
    return {
      type: 'category',
      data,
      ...(interval != null && interval >= 0 ? { axisLabel: { interval } } : {}),
    };
  }

  /**
   * A value (or log) axis with optional fixed bounds, a forced tick interval, a number-formatting
   * tick label, and `scale` (fit to the data rather than anchoring at zero).
   */
  public static numericAxis(
    logScale: boolean | undefined,
    min: number | null | undefined,
    max: number | null | undefined,
    interval: number | null | undefined,
    config: NumericColumnConfig | undefined,
    scale?: boolean,
  ): ValueAxisFragment {
    return {
      // A log axis takes the exact same option fields as a value axis, so the fragment types both
      // as `'value'` — a single literal keeps the assembled axis narrowable — and only this field
      // is asserted, leaving every other field fully checked.
      type: (logScale ? 'log' : 'value') as 'value',
      ...(min != null ? { min } : {}),
      ...(max != null ? { max } : {}),
      // A zero/negative interval would make echarts lay out endless ticks, so only a positive one counts.
      ...(interval != null && interval > 0 ? { interval } : {}),
      // Explicit bounds already pin the range, so `scale` only matters when they're absent.
      ...(scale ? { scale: true } : {}),
      axisLabel: {
        formatter: (value: number | string) =>
          typeof value === 'number' ? ChartFormat.numeric(value, config) : String(value),
      },
    };
  }

  /** Resolves an axis's label orientation to echarts `axisLabel.rotate` degrees; unset falls back to `auto`. */
  public static labelRotate(rotation: AxisLabelRotation | null | undefined, auto = 0): number {
    if (rotation === 'vertical') return 90;
    if (rotation === 'horizontal') return 0;
    return auto;
  }

  /** The longest string among `labels`, in characters. */
  public static longestLen(labels: readonly string[]): number {
    let n = 0;
    for (const s of labels) if (s.length > n) n = s.length;
    return n;
  }

  /**
   * A `nameGap` (the px between the axis line and its name) big enough that the name clears the
   * tick labels, so the two never overlap. echarts can't size this itself, so estimate the
   * labels' extent *towards the name* from the longest label, its rotation, and the axis
   * orientation: an X name sits below its labels (their height when flat, their length when
   * upright), a Y name sits beside them (their length when flat, their height when upright).
   * Deliberately errs wide — extra whitespace is harmless, an overlap is not.
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

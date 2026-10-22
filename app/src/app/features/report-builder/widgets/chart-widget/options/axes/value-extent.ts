import { NumericExtent } from './types/numeric-extent';

/** The numeric range of plotted values, used to size axis name gaps. */
export class ValueExtent {
  /** The min and max of the numbers among `values`, or null when there are none. */
  public static of(values: Iterable<unknown>): NumericExtent | null {
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (typeof v !== 'number') {
        continue;
      }
      if (v < min) {
        min = v;
      }
      if (v > max) {
        max = v;
      }
    }
    return Number.isFinite(min) ? { min, max } : null;
  }

  /**
   * The longest tick label, estimated by formatting the extent's ends, without knowing which ticks
   * echarts picks. 0 when there are no numbers.
   */
  public static labelLength(values: Iterable<unknown>, format: (value: number) => string): number {
    const extent = ValueExtent.of(values);
    if (!extent) {
      return 0;
    }
    return Math.max(format(extent.min).length, format(extent.max).length);
  }
}

import { Box, ResolvedToleranceBand } from '../../../../../../core/models/widget-query';

/** Process performance of a box against the chart's spec band. */
export class BoxCapability {
  /**
   * Pp = (USL − LSL) / 6σ and Ppk, using the overall σ (performance, not capability).
   * Null when σ is zero.
   */
  public static text(box: Box, spec: ResolvedToleranceBand | null): string | null {
    if (!spec || spec.min === null || spec.max === null || box.stdDev <= 0) return null;
    const pp = (spec.max - spec.min) / (6 * box.stdDev);
    const ppk = Math.min(spec.max - box.mean, box.mean - spec.min) / (3 * box.stdDev);
    return `Pp: ${pp.toFixed(2)} · Ppk: ${ppk.toFixed(2)}`;
  }

  /** The single value-axis band with both limits, else null. */
  public static specBand(bands: readonly ResolvedToleranceBand[]): ResolvedToleranceBand | null {
    const usable = bands.filter((b) => b.axis === 'y' && b.min !== null && b.max !== null);
    return usable.length === 1 ? usable[0] : null;
  }
}

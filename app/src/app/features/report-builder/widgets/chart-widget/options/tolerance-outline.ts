import { ResolvedToleranceBand } from '../../../../../core/models/widget-query';

const OUTLINE_CONCESSION = '#d97706'; // orange: past min/max, still inside the concession band
const OUTLINE_FAIL = '#dc2626'; // red: past the concession bound (or past min/max when there is none)

/** Decides whether a plotted value is out of tolerance and in which colour to outline it. */
export class ToleranceOutline {
  /**
   * Outline colour for a plotted point across every band with `outlinePoints` on, or null in
   * spec. Each band is tested on its own axis; a category value is never outlined. Most severe wins.
   */
  public static forPoints(
    bands: readonly ResolvedToleranceBand[],
  ): (x: number | string, y: number | string) => string | null {
    const active = ToleranceOutline.activeBands(bands);
    if (active.length === 0) return () => null;

    return (x, y) => {
      let color: string | null = null;
      for (const band of active) {
        const value = band.axis === 'x' ? x : y;
        if (typeof value === 'number') color = ToleranceOutline.worse(color, ToleranceOutline.colorFor(value, band));
      }
      return color;
    };
  }

  /** Outline colour for a single measure value (a bar's height); a bar's bands always sit on the value axis. */
  public static forValue(bands: readonly ResolvedToleranceBand[]): (value: number) => string | null {
    const active = ToleranceOutline.activeBands(bands);
    if (active.length === 0) return () => null;

    return (value) => {
      let color: string | null = null;
      for (const band of active) color = ToleranceOutline.worse(color, ToleranceOutline.colorFor(value, band));
      return color;
    };
  }

  /** An outlined mark: the series colour as fill, bordered in the crossed limit's colour. */
  public static itemStyle(seriesColor: string, borderColor: string): object {
    return { color: seriesColor, borderColor, borderWidth: 2 };
  }

  private static activeBands(bands: readonly ResolvedToleranceBand[]): ResolvedToleranceBand[] {
    return bands.filter((b) => b.outlinePoints && b.min !== null && b.max !== null);
  }

  /**
   * Outline colour for a value against one band, or null in spec. Red past the concession bound —
   * or past min/max where that side has no concession — and orange in the concession shoulder.
   */
  private static colorFor(value: number, band: ResolvedToleranceBand): string | null {
    const lowFail = band.concessionLower ?? band.min!;
    const highFail = band.concessionUpper ?? band.max!;
    if (value < lowFail || value > highFail) return OUTLINE_FAIL;
    if (value < band.min! || value > band.max!) return OUTLINE_CONCESSION;
    return null;
  }

  /** The more severe of two outline colours (red beats orange beats none). */
  private static worse(a: string | null, b: string | null): string | null {
    if (a === OUTLINE_FAIL || b === OUTLINE_FAIL) return OUTLINE_FAIL;
    return a ?? b;
  }
}

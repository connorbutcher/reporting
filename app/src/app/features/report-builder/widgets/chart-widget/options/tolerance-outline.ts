import { ResolvedToleranceBand } from '../../../../../core/models/widget-query';
import { OutlineItemStyle } from './chart-option.types';

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

  /**
   * Outline colour for a value *range* (a box's whisker extent) against every active band, or
   * null when the whole range sits in spec. A box is flagged by whichever of its ends is furthest
   * out of tolerance — the most severe colour across both ends and all bands wins.
   */
  public static forExtent(
    bands: readonly ResolvedToleranceBand[],
  ): (low: number, high: number) => string | null {
    const forValue = ToleranceOutline.forValue(bands);
    return (low, high) => ToleranceOutline.worse(forValue(low), forValue(high));
  }

  /** An outlined mark: the series colour as fill, bordered in the crossed limit's colour. */
  public static itemStyle(seriesColor: string, borderColor: string): OutlineItemStyle {
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

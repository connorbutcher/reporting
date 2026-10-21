import { OutlineItemStyle } from './types/outline-item-style';
import { OutlineZone } from './types/outline-zone';

const OUTLINE_CONCESSION = '#d97706'; // orange: past the warn bound, still inside the fail bound
const OUTLINE_FAIL = '#dc2626'; // red: past the fail bound (or past warn, when there's no milder tier)

/** Classifies plotted values against a set of outline zones — tolerance bands, guide lines, or both. */
export class OutlineSeverity {
  /**
   * Outline colour for a plotted point across every zone, or null when it's in spec on all of
   * them. Each zone is tested on its own axis; a category value is never outlined. Most severe wins.
   */
  public static forPoints(
    zones: readonly OutlineZone[],
  ): (x: number | string, y: number | string) => string | null {
    if (zones.length === 0) return () => null;

    return (x, y) => {
      let color: string | null = null;
      for (const zone of zones) {
        const value = zone.axis === 'x' ? x : y;
        if (typeof value === 'number')
          color = OutlineSeverity.worse(color, OutlineSeverity.colorFor(value, zone));
      }
      return color;
    };
  }

  /** Outline colour for a single measure value (a bar's height); every zone is tested on its own axis's value. */
  public static forValue(zones: readonly OutlineZone[]): (value: number) => string | null {
    if (zones.length === 0) return () => null;

    return (value) => {
      let color: string | null = null;
      for (const zone of zones)
        color = OutlineSeverity.worse(color, OutlineSeverity.colorFor(value, zone));
      return color;
    };
  }

  /**
   * Outline colour for a value *range* (a box's whisker extent) against every zone, or null when
   * the whole range is in spec. Flagged by whichever end is furthest out — the most severe colour
   * across both ends and every zone wins.
   */
  public static forExtent(
    zones: readonly OutlineZone[],
  ): (low: number, high: number) => string | null {
    const forValue = OutlineSeverity.forValue(zones);
    return (low, high) => OutlineSeverity.worse(forValue(low), forValue(high));
  }

  /** An outlined mark: the series colour as fill, bordered in the crossed zone's colour. */
  public static itemStyle(seriesColor: string, borderColor: string): OutlineItemStyle {
    // The dashed border carries the warning for readers who can't tell the colours apart.
    return { color: seriesColor, borderColor, borderWidth: 2.5, borderType: 'dashed' };
  }

  /**
   * Outline colour for a value against one zone, or null in spec. Red past the fail bound — or
   * past the warn bound, where the two coincide (a guide line has no milder tier) — and orange
   * in a tolerance band's concession shoulder.
   */
  private static colorFor(value: number, zone: OutlineZone): string | null {
    if (value < zone.failLow || value > zone.failHigh) return OUTLINE_FAIL;
    if (value < zone.warnLow || value > zone.warnHigh) return OUTLINE_CONCESSION;
    return null;
  }

  /** The more severe of two outline colours (red beats orange beats none). */
  private static worse(a: string | null, b: string | null): string | null {
    if (a === OUTLINE_FAIL || b === OUTLINE_FAIL) return OUTLINE_FAIL;
    return a ?? b;
  }
}

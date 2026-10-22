import { OutlineItemStyle } from './types/outline-item-style';
import { OutlineZone } from './types/outline-zone'; // red: past the fail bound (or past warn, when there's no milder tier)

/** Classifies plotted values against outline zones from tolerance bands and guide lines. */
export class OutlineSeverity {
  private static readonly OUTLINE_CONCESSION = '#d97706';
  // orange: past the warn bound, still inside the fail bound
  private static readonly OUTLINE_FAIL = '#dc2626';

  /** Outline colour for a point, or null when in spec on every zone. Most severe wins. */
  public static forPoints(
    zones: readonly OutlineZone[],
  ): (x: number | string, y: number | string) => string | null {
    if (zones.length === 0) {
      return () => null;
    }

    return (x, y) => {
      let color: string | null = null;
      for (const zone of zones) {
        const value = zone.axis === 'x' ? x : y;
        if (typeof value === 'number') {
          color = OutlineSeverity.worse(color, OutlineSeverity.colorFor(value, zone));
        }
      }
      return color;
    };
  }

  /** Outline colour for a single measure value, such as a bar's height. */
  public static forValue(zones: readonly OutlineZone[]): (value: number) => string | null {
    if (zones.length === 0) {
      return () => null;
    }

    return (value) => {
      let color: string | null = null;
      for (const zone of zones) {
        color = OutlineSeverity.worse(color, OutlineSeverity.colorFor(value, zone));
      }
      return color;
    };
  }

  /** Outline colour for a range, such as a box's whiskers, from whichever end is furthest out. */
  public static forExtent(
    zones: readonly OutlineZone[],
  ): (low: number, high: number) => string | null {
    const forValue = OutlineSeverity.forValue(zones);
    return (low, high) => OutlineSeverity.worse(forValue(low), forValue(high));
  }

  /** An outlined mark: the series colour as fill, bordered in the crossed zone's colour. */
  public static itemStyle(seriesColor: string, borderColor: string): OutlineItemStyle {
    // The dashed border carries the warning without relying on colour.
    return { color: seriesColor, borderColor, borderWidth: 2.5, borderType: 'dashed' };
  }

  /** Red past the fail bound (or a guide line), orange in a tolerance band's concession shoulder. */
  private static colorFor(value: number, zone: OutlineZone): string | null {
    if (value < zone.failLow || value > zone.failHigh) {
      return OutlineSeverity.OUTLINE_FAIL;
    }
    if (value < zone.warnLow || value > zone.warnHigh) {
      return OutlineSeverity.OUTLINE_CONCESSION;
    }
    return null;
  }

  private static worse(a: string | null, b: string | null): string | null {
    if (a === OutlineSeverity.OUTLINE_FAIL || b === OutlineSeverity.OUTLINE_FAIL) {
      return OutlineSeverity.OUTLINE_FAIL;
    }
    return a ?? b;
  }
}

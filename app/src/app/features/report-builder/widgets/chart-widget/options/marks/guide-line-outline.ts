import { ChartGuideLine } from '../../../../../../core/models/report';
import { OutlineZone } from './types/outline-zone';

/** Outline zones from guide lines; with no concession tier, crossing one always fails. */
export class GuideLineOutline {
  public static zonesFor(lines: readonly ChartGuideLine[]): OutlineZone[] {
    return lines.filter((line) => line.outlinePoints).map(GuideLineOutline.zoneFor);
  }

  private static zoneFor(line: ChartGuideLine): OutlineZone {
    if (line.valueTo !== null && line.valueTo !== undefined) {
      const low = Math.min(line.value, line.valueTo);
      const high = Math.max(line.value, line.valueTo);
      return { axis: line.axis, warnLow: low, warnHigh: high, failLow: low, failHigh: high };
    }
    return line.direction === 'below'
      ? {
          axis: line.axis,
          warnLow: line.value,
          warnHigh: Infinity,
          failLow: line.value,
          failHigh: Infinity,
        }
      : {
          axis: line.axis,
          warnLow: -Infinity,
          warnHigh: line.value,
          failLow: -Infinity,
          failHigh: line.value,
        };
  }
}

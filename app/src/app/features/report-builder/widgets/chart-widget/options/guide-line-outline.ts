import { ChartGuideLine } from '../../../../../core/models/report';
import { OutlineZone } from './outline-zone';

/**
 * Turns guide lines with outlining on into generic {@link OutlineZone}s — a single boundary (or,
 * once the line is a range, two) with no milder "concession" tier, so crossing it always reads
 * as a fail rather than tolerance's two-stage warn/fail.
 */
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

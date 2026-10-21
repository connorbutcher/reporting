import { ResolvedToleranceBand } from '../../../../../../core/models/widget-query';
import { OutlineZone } from './types/outline-zone';

/** Turns resolved tolerance bands with outlining on into generic {@link OutlineZone}s. */
export class ToleranceOutline {
  public static zonesFor(bands: readonly ResolvedToleranceBand[]): OutlineZone[] {
    return bands
      .filter((band) => band.outlinePoints && band.min !== null && band.max !== null)
      .map((band) => ({
        axis: band.axis,
        warnLow: band.min!,
        warnHigh: band.max!,
        failLow: band.concessionLower ?? band.min!,
        failHigh: band.concessionUpper ?? band.max!,
      }));
  }
}

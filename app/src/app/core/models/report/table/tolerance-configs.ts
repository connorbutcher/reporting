import { ToleranceConfig } from './tolerance-config.model';

export class ToleranceConfigs {
  /**
   * Whether a column's limits are one fixed band. The tolerance filter operators ("in tolerance",
   * "needs concession"…) test against a single band, so they're only offered on such a column — not
   * on one whose limits change from row to row.
   */
  public static hasFixedLimits(tolerance: ToleranceConfig | null | undefined): boolean {
    return !!tolerance && !tolerance.match;
  }
}

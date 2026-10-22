import { ToleranceConfig } from './tolerance-config.model';

export class ToleranceConfigs {
  /** Tolerance filter operators need one fixed band, so they're only offered on such columns. */
  public static hasFixedLimits(tolerance: ToleranceConfig | null | undefined): boolean {
    return !!tolerance && !tolerance.match;
  }
}

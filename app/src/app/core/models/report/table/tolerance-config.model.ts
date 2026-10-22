import { ToleranceLimits } from './tolerance-limits.model';
import { ToleranceMatch } from './tolerance-match.model';

/**
 * Red/amber banding against a limits dataset. Min/Max is in spec; concession bounds widen it into
 * amber. Checked against {@link sourceRowId}, or a row per data row with {@link match}.
 */
export type ToleranceConfig = ToleranceLimits & {
  sourceRowId?: string;
  match?: ToleranceMatch;
};

import { ToleranceLimits } from './tolerance-limits.model';
import { ToleranceMatch } from './tolerance-match.model';

/**
 * Red/amber banding for a numeric column, resolved against a separate limits dataset so the same
 * spec can be reused across columns and reports. Min/Max is the in-spec range; the optional
 * concession bounds widen it into an amber "needs sign-off" zone before a value goes red.
 *
 * By default every value is checked against one fixed row ({@link sourceRowId}); with {@link match}
 * the row is chosen per data row instead, and there is no fixed row.
 */
export type ToleranceConfig = ToleranceLimits & {
  sourceRowId?: string;
  match?: ToleranceMatch;
};

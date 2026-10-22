import { ToleranceLimits } from './tolerance-limits.model';

/** Limits taken from one fixed row of the limits dataset. */
export type FixedToleranceConfig = ToleranceLimits & {
  sourceRowId: string;
};

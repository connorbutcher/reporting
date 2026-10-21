/**
 * A one-axis outline test. Tolerance bands have a milder warn tier inside the fail tier; guide
 * lines set both tiers equal. An infinite bound disables that side.
 */
export interface OutlineZone {
  axis: 'x' | 'y';
  warnLow: number;
  warnHigh: number;
  failLow: number;
  failHigh: number;
}

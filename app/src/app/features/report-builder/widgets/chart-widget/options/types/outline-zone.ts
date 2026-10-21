/**
 * A one-axis test for whether a plotted value should be outlined, and how severely —
 * the shared shape a tolerance band's two tiers ({@link OutlineZone.warnLow}/`warnHigh`
 * milder than `failLow`/`failHigh`) and a guide line's single boundary (both tiers
 * equal, so a guide line is always "fail", never the milder "concession") both reduce
 * to. `Infinity`/`-Infinity` disables a side that has no bound.
 */
export interface OutlineZone {
  axis: 'x' | 'y';
  warnLow: number;
  warnHigh: number;
  failLow: number;
  failHigh: number;
}

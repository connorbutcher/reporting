import type { XAXisComponentOption, YAXisComponentOption } from 'echarts';
import { AxisLabelFormatting } from './axis-label-formatting';

/**
 * One cartesian axis fragment, before the caller layers on name/position/etc. Kept per-scale with
 * a single-literal `type` (and no `mainType`) so the assembled axis narrows cleanly to one member
 * of the discriminated {@link XAXisComponentOption}/{@link YAXisComponentOption} union — a `type`
 * left as a union of literals would be assignable to neither.
 */
export interface ValueAxisFragment {
  type: 'value';
  min?: number;
  max?: number;
  interval?: number;
  /** Fit the axis to the data rather than anchoring it at zero. */
  scale?: boolean;
  axisLabel?: AxisLabelFormatting;
}

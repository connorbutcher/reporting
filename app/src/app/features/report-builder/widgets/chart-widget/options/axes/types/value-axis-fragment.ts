import type { XAXisComponentOption, YAXisComponentOption } from 'echarts';
import { AxisLabelFormatting } from './axis-label-formatting';

/**
 * One axis fragment with a single-literal `type`, so the assembled axis narrows to one member of
 * the echarts axis union.
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

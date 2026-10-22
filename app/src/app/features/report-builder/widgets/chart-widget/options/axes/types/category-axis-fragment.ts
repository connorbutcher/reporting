import { AxisLabelFormatting } from './axis-label-formatting';

export type CategoryAxisFragment = {
  type: 'category';
  data: string[];
  axisLabel?: AxisLabelFormatting;
};

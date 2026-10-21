import { AxisLabelFormatting } from './axis-label-formatting';

export interface CategoryAxisFragment {
  type: 'category';
  data: string[];
  axisLabel?: AxisLabelFormatting;
}

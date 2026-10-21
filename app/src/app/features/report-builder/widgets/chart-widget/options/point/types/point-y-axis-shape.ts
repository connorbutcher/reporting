import { NumericColumnConfig } from '../../../../../../../core/models/dataset';
import { ChartSeriesResult } from '../../../../../../../core/models/widget-query';

/** What one Y axis plots: its series and whether it reads as dates, text or numbers. */
export interface PointYAxisShape {
  isPrimary: boolean;
  isDate: boolean;
  isText: boolean;
  series: ChartSeriesResult[];
  categories: string[] | null;
  numericConfig: NumericColumnConfig | undefined;
}

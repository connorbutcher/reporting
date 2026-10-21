import { ChartSeriesBinding } from '../../../../../core/models/report/index';
import { BarChartQueryResult } from '../../../../../core/models/widget-query/index';

/** One binding's bar-chart response, tagged with the binding it came from. */
export interface BarChartPart {
  binding: ChartSeriesBinding;
  result: BarChartQueryResult;
}

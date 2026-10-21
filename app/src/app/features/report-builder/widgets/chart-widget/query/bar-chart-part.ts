import { ChartSeriesBinding } from '../../../../../core/models/report';
import { BarChartQueryResult } from '../../../../../core/models/widget-query';

/** One binding's bar-chart response, tagged with the binding it came from. */
export interface BarChartPart {
  binding: ChartSeriesBinding;
  result: BarChartQueryResult;
}

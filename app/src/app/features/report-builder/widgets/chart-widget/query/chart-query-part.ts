import { ChartSeriesBinding } from '../../../../../core/models/report/index';
import { ChartQueryResult } from '../../../../../core/models/widget-query/index';

/** One binding's point-chart response, tagged with the binding it came from. */
export interface ChartQueryPart {
  binding: ChartSeriesBinding;
  result: ChartQueryResult;
}

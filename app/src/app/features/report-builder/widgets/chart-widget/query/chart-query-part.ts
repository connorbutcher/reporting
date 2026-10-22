import { ChartSeriesBinding } from '../../../../../core/models/report';
import { ChartQueryResult } from '../../../../../core/models/widget-query';

/** One binding's point-chart response, tagged with the binding it came from. */
export type ChartQueryPart = {
  binding: ChartSeriesBinding;
  result: ChartQueryResult;
};

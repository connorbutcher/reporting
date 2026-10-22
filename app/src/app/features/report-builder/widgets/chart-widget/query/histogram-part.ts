import { ChartSeriesBinding } from '../../../../../core/models/report';
import { HistogramQueryResult } from '../../../../../core/models/widget-query';

/** One binding's histogram response, tagged with the binding it came from. */
export type HistogramPart = {
  binding: ChartSeriesBinding;
  result: HistogramQueryResult;
};

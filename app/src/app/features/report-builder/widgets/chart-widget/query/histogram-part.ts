import { ChartSeriesBinding } from '../../../../../core/models/report/index';
import { HistogramQueryResult } from '../../../../../core/models/widget-query/index';

/** One binding's histogram response, tagged with the binding it came from. */
export interface HistogramPart {
  binding: ChartSeriesBinding;
  result: HistogramQueryResult;
}

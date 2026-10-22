import { HistogramSeriesResult } from '../../../../../../core/models/widget-query';

/** A distribution with its resolved name and colour, shared by its bars and fitted curve. */
export type HistogramSeries = {
  readonly result: HistogramSeriesResult;
  readonly name: string;
  readonly color: string;
};

import { BoxPlotSeriesResult } from '../../../../../../core/models/widget-query';

/** A box series with its resolved name and colour, shared by its boxes and overlays. */
export type BoxSeries = {
  readonly result: BoxPlotSeriesResult;
  readonly name: string;
  readonly color: string;
};

import { ChartSymbol, LineDashStyle } from '../../../../../../../core/models/report';

/** One series' presentation, read live from its binding. A null colour uses the palette. */
export type SeriesStyle = {
  color: string | null;
  symbol: ChartSymbol | null;
  dashStyle: LineDashStyle | null;
};

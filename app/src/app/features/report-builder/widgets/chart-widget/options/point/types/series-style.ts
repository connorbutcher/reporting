import { ChartSymbol, LineDashStyle } from '../../../../../../../core/models/report';

/** One series' presentation, read live from its binding. A null colour uses the palette. */
export interface SeriesStyle {
  color: string | null;
  symbol: ChartSymbol | null;
  dashStyle: LineDashStyle | null;
}

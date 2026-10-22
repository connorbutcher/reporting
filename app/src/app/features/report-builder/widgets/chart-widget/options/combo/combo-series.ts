import { ChartSymbol, LineDashStyle } from '../../../../../../core/models/report';
import { BarSeriesResult } from '../../../../../../core/models/widget-query';

export type ComboSeries = {
  result: BarSeriesResult;
  axisIndex: number;
  renderAs: 'bar' | 'line';
  color: string;
  /** Line marker override from the binding; null uses the default (or none per `showPoints`). */
  symbol: ChartSymbol | null;
  /** Line dash override from the binding; null draws solid. */
  dashStyle: LineDashStyle | null;
};

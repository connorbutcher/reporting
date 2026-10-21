import { ChartSymbol, LineDashStyle } from '../../../../../../core/models/report/index';
import { BarSeriesResult } from '../../../../../../core/models/widget-query/index';

/** One resolved series ready to draw: its query result plus the axis, render kind, and styling it plots with. */
export interface ComboSeries {
  result: BarSeriesResult;
  axisIndex: number;
  renderAs: 'bar' | 'line';
  color: string;
  /** Line marker override from the binding; null uses the default (or none per `showPoints`). */
  symbol: ChartSymbol | null;
  /** Line dash override from the binding; null draws solid. */
  dashStyle: LineDashStyle | null;
}

import { ChartPoint } from './chart-point.model';
import { TrendLine } from './trend-line.model';

export type ChartSeriesResult = {
  label: string;
  points: ChartPoint[];
  /**
   * The id of the binding this series came from, stamped client-side when overlays
   * are merged (absent on a raw server response). The option builder resolves the
   * series' live presentation — its Y axis, colour, marker, and dash — from this
   * binding's current config, so appearance edits reflect without a refetch. A
   * binding that splits by colour contributes several series that share this id.
   */
  bindingId?: string;
  /** This series' least-squares fit, when requested and both axes are numeric/date. */
  trendLine?: TrendLine | null;
};

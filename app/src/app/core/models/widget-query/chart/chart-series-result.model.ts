import { ChartPoint } from './chart-point.model';
import { TrendLine } from './trend-line.model';

export type ChartSeriesResult = {
  label: string;
  points: ChartPoint[];
  /** Stamped client-side when overlays merge; presentation is read live from this binding's config. */
  bindingId?: string;
  /** This series' least-squares fit, when requested and both axes are numeric/date. */
  trendLine?: TrendLine | null;
};

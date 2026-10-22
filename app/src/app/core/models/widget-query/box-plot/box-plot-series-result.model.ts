import { Box } from './box.model';
import { BoxOutlier } from './box-outlier.model';
import { FilterGroup } from '../../filter';

export type BoxPlotSeriesResult = {
  label: string;
  /** One entry per category in {@link BoxPlotQueryResult.categories} order; null where this series has no rows there. */
  boxes: (Box | null)[];
  /** Values past the whiskers (Tukey only). Empty for min/max whiskers. */
  outliers: BoxOutlier[];
  /** Conditions selecting this series' rows (its split value), for drill-through; null with no split. */
  drill?: FilterGroup | null;
};

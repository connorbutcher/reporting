import { ChartSort, BoxWhisker, ChartToleranceBand, DateGrouping } from '../report';
import { FilterGroup } from '../filter';
import { ChartCategoryDetail, ChartRowCounts, ResolvedToleranceBand } from './chart-query.model';

export interface BoxPlotQueryRequest {
  filter: FilterGroup | null;
  /** The column whose distinct values become the boxes (any type). */
  categoryColumnId: string;
  /** The numeric column whose per-category distribution each box summarises. */
  valueColumnId: string;
  seriesColumnId: string | null;
  whisker: BoxWhisker;
  /** The whisker length multiplier — of the IQR for `tukey`, of the standard deviation for `stdDev`. */
  whiskerFactor: number;
  sort: ChartSort;
  /** Requests a capped sample of each box's raw values, for the jittered overlay. */
  includePoints: boolean;
  toleranceBands: ChartToleranceBand[];
  categoryGrouping?: DateGrouping | null;
}

/** One category's box summary for a series. */
export interface Box {
  /** The lower whisker end: the actual minimum, or the smallest value inside the lower fence. */
  min: number;
  q1: number;
  median: number;
  q3: number;
  /** The upper whisker end: the actual maximum, or the largest value inside the upper fence. */
  max: number;
  /** The arithmetic mean, for the mean marker and performance (Pp/Ppk). */
  mean: number;
  /** The sample standard deviation (n−1); 0 for a single value. */
  stdDev: number;
  /** How many rows fed this box. */
  count: number;
  /** A capped sample of the raw values behind this box, for the jittered overlay. Empty unless requested. */
  points: number[];
}

/** A single value beyond a Tukey whisker, tagged with the category slot it belongs to. */
export interface BoxOutlier {
  /** Index into {@link BoxPlotQueryResult.categories} — the box this point sits above. */
  categoryIndex: number;
  value: number;
}

export interface BoxPlotSeriesResult {
  label: string;
  /** One entry per category in {@link BoxPlotQueryResult.categories} order; null where this series has no rows there. */
  boxes: (Box | null)[];
  /** Values past the whiskers (Tukey only). Empty for min/max whiskers. */
  outliers: BoxOutlier[];
  /** Conditions selecting this series' rows (its split value), for drill-through; null with no split. */
  drill?: FilterGroup | null;
}

export interface BoxPlotQueryResult extends ChartRowCounts {
  id: string;
  name: string;
  /** The box categories, in display order — the shared axis every series aligns to. */
  categories: string[];
  categoryDetails?: ChartCategoryDetail[];
  series: BoxPlotSeriesResult[];
  toleranceBands: ResolvedToleranceBand[];
}

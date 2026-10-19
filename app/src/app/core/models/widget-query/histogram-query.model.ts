import { ChartToleranceBand, HistogramBinMode, HistogramNormalize } from '../report';
import { FilterGroup } from '../filter';
import { ChartRowCounts, PartialChartLoad, ResolvedToleranceBand } from './chart-query.model';

export interface HistogramQueryRequest {
  filter: FilterGroup | null;
  /** The numeric columns whose values are binned, each its own distribution sharing one set of bin edges. */
  valueColumnIds: string[];
  /** Splits each distribution into an overlaid series per distinct value. Null yields one series per column. */
  seriesColumnId: string | null;
  binMode: HistogramBinMode;
  /** The number of bins for `count` mode; ignored otherwise. */
  binCount: number;
  /** The width of each bin for `width` mode; ignored otherwise. */
  binWidth: number;
  /** Fixed lower bound of the binned range; null uses the data's minimum. */
  rangeMin?: number | null;
  /** Fixed upper bound of the binned range; null uses the data's maximum. */
  rangeMax?: number | null;
  normalize: HistogramNormalize;
  cumulative: boolean;
  toleranceBands: ChartToleranceBand[];
}

/** One bin of a histogram: its half-open value range and a ready-made axis label. */
export interface HistogramBin {
  /** The bin's inclusive lower edge. */
  lower: number;
  /** The bin's exclusive upper edge (inclusive for the final bin). */
  upper: number;
  /** A display label for the bin's range, e.g. "10 – 20". */
  label: string;
}

export interface HistogramSeriesResult {
  /**
   * The series' display label. From the server it's the split (colour-by) key ("" when no split);
   * {@link ChartQuery} rewrites it to the composed legend label (binding · measure · split).
   */
  label: string;
  /** Which column this series distributes, when several value columns are plotted. */
  valueColumnId?: string | null;
  /** The measure column's display name, for composing a multi-measure legend label. */
  valueColumnLabel?: string;
  /** Client-side, after merging: the binding this series came from. */
  bindingId?: string;
  /** One value per bin in {@link HistogramQueryResult.bins} order — a count, frequency, or density. */
  values: number[];
  /** The series' own mean, σ and in-range count, for a fitted normal curve. */
  mean?: number;
  stdDev?: number;
  count?: number;
  /** Conditions selecting this series' rows (its split value), for drill-through; null with no split. */
  drill?: FilterGroup | null;
}

export interface HistogramQueryResult extends ChartRowCounts, PartialChartLoad {
  id: string;
  name: string;
  /** The bins, in ascending order — the shared category axis every series aligns to. */
  bins: HistogramBin[];
  series: HistogramSeriesResult[];
  /** Values left out because they fell outside a fixed range. */
  excludedCount?: number;
  toleranceBands: ResolvedToleranceBand[];
}

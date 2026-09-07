import { ChartToleranceBand, HistogramBinMode, HistogramNormalize } from '../report';
import { FilterGroup } from '../filter';
import { ResolvedToleranceBand } from './chart-query.model';

export interface HistogramQueryRequest {
  filter: FilterGroup | null;
  /** The numeric column whose values are binned into the distribution. */
  valueColumnId: string;
  /** Splits the distribution into an overlaid series per distinct value. Null yields one series. */
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
  label: string;
  /** One value per bin in {@link HistogramQueryResult.bins} order — a count, frequency, or density. */
  values: number[];
}

export interface HistogramQueryResult {
  id: string;
  name: string;
  /** The bins, in ascending order — the shared category axis every series aligns to. */
  bins: HistogramBin[];
  series: HistogramSeriesResult[];
  toleranceBands: ResolvedToleranceBand[];
}

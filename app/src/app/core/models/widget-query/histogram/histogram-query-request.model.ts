import { FilterGroup } from '../../filter';
import {
  ChartToleranceBand,
  ChartTooltipColumn,
  HistogramBinMode,
  HistogramNormalize,
} from '../../report';

export type HistogramQueryRequest = {
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
  /** Extra numeric columns averaged over each bin's rows, for its tooltip. */
  tooltipColumns?: ChartTooltipColumn[];
};

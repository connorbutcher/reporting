import { ChartCategoryDetail } from '../chart/chart-category-detail.model';
import { ChartRowCounts } from '../chart/chart-row-counts.model';
import { ResolvedToleranceBand } from '../chart/resolved-tolerance-band.model';
import { BoxPlotSeriesResult } from './box-plot-series-result.model';

export type BoxPlotQueryResult = ChartRowCounts & {
  id: string;
  name: string;
  /** The box categories, in display order — the shared axis every series aligns to. */
  categories: string[];
  categoryDetails?: ChartCategoryDetail[];
  series: BoxPlotSeriesResult[];
  toleranceBands: ResolvedToleranceBand[];
};

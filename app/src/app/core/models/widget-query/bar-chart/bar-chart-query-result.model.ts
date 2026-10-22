import { ChartCategoryDetail } from '../chart/chart-category-detail.model';
import { ChartRowCounts } from '../chart/chart-row-counts.model';
import { PartialChartLoad } from '../chart/partial-chart-load.model';
import { ResolvedToleranceBand } from '../chart/resolved-tolerance-band.model';
import { BarSeriesResult } from './bar-series-result.model';

export type BarChartQueryResult = ChartRowCounts &
  PartialChartLoad & {
    id: string;
    name: string;
    /** The bar categories, in display order — the shared axis every series aligns to. */
    categories: string[];
    /** One per category: natural sort key and drill-through conditions. */
    categoryDetails?: ChartCategoryDetail[];
    series: BarSeriesResult[];
    toleranceBands: ResolvedToleranceBand[];
  };

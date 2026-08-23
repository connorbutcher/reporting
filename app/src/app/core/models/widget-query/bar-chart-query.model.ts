import { Aggregate, ChartToleranceBand } from '../report';
import { FilterGroup } from '../filter';
import { ResolvedToleranceBand } from './chart-query.model';

export interface BarChartQueryRequest {
  filter: FilterGroup | null;
  /** The column whose distinct values become the bars (any type). */
  categoryColumnId: string;
  /** The numeric column the aggregate reduces. Null — and ignored — for 'count'. */
  valueColumnId: string | null;
  aggregate: Aggregate;
  seriesColumnId: string | null;
  toleranceBands: ChartToleranceBand[];
}

export interface BarSeriesResult {
  label: string;
  /** One entry per category in {@link BarChartQueryResult.categories} order; null where this series has no rows in that category. */
  values: (number | null)[];
}

export interface BarChartQueryResult {
  id: string;
  name: string;
  /** The bar categories, in display order — the shared axis every series aligns to. */
  categories: string[];
  series: BarSeriesResult[];
  toleranceBands: ResolvedToleranceBand[];
}

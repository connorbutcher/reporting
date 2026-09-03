import { Aggregate, ChartToleranceBand } from '../report';
import { FilterGroup } from '../filter';
import { ResolvedToleranceBand } from './chart-query.model';

export interface BarChartQueryRequest {
  filter: FilterGroup | null;
  /** The column whose distinct values become the bars (any type). */
  categoryColumnId: string;
  /** The numeric columns the aggregate reduces, each a series. Empty — and ignored — for 'count'. */
  valueColumnIds: string[];
  aggregate: Aggregate;
  seriesColumnId: string | null;
  toleranceBands: ChartToleranceBand[];
}

export interface BarSeriesResult {
  /**
   * The series' display label. From the server it's the split (colour-by) key ("" when no split);
   * {@link ChartQuery} rewrites it to the composed legend label (binding · measure · split).
   */
  label: string;
  /** Which measure this series reduces, when several value columns are plotted; null/absent for 'count'. */
  valueColumnId?: string | null;
  /** The measure column's display name, for composing a multi-measure legend label; empty for 'count'. */
  valueColumnLabel?: string;
  /** The binding this series came from, set during the client merge — drives its stack group and colour override. */
  bindingId?: string;
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

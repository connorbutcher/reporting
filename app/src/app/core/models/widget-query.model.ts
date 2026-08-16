import {
  Aggregate,
  ChartAxis,
  ChartToleranceBand,
  ChartTooltipColumn,
  DataTableColumnSetting,
  SortDirection,
} from './report.model';
import { FilterGroup } from './filter.model';

export type ToleranceStatus = 'none' | 'pass' | 'concession' | 'fail';

// --- table-query -------------------------------------------------------

export interface TableQueryRequest {
  filter: FilterGroup | null;
  sortColumnId: string | null;
  sortDirection: SortDirection;
  skip: number;
  take: number;
  columns: DataTableColumnSetting[];
}

export interface TableCell {
  displayValue: string | null;
  tolerance: ToleranceStatus;
}

export interface TableRowResult {
  id: string;
  cells: Record<string, TableCell>;
}

export interface TableQueryResult {
  id: string;
  name: string;
  rows: TableRowResult[];
  totalRowCount: number;
  matchedRowCount: number;
}

// --- chart-query -------------------------------------------------------

export interface ChartQueryRequest {
  filter: FilterGroup | null;
  xColumnId: string;
  yColumnId: string;
  seriesColumnId: string | null;
  toleranceBands: ChartToleranceBand[];
  tooltipColumns: ChartTooltipColumn[];
}

export interface ChartPoint {
  x: number;
  y: number;
  tooltipLines: string[];
}

export interface ChartSeriesResult {
  label: string;
  points: ChartPoint[];
}

export interface ResolvedToleranceBand {
  id: string;
  axis: ChartAxis;
  min: number | null;
  max: number | null;
  concessionLower: number | null;
  concessionUpper: number | null;
}

export interface ChartQueryResult {
  id: string;
  name: string;
  series: ChartSeriesResult[];
  toleranceBands: ResolvedToleranceBand[];
}

// --- bar-chart-query ---------------------------------------------------

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

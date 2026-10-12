import { ChartAxis, ChartSort, ChartToleranceBand, ChartTooltipColumn } from '../report';
import { FilterGroup } from '../filter';

export interface ChartQueryRequest {
  filter: FilterGroup | null;
  xColumnId: string;
  yColumnId: string;
  seriesColumnId: string | null;
  /** Scales each point's marker by this numeric column's value — a scatter bubble chart. */
  sizeColumnId?: string | null;
  toleranceBands: ChartToleranceBand[];
  tooltipColumns: ChartTooltipColumn[];
  /** Draw order for the returned points; null keeps the default X-ascending order. */
  sort?: ChartSort | null;
  /** Fits a least-squares trend line per series, when both axes are numeric/date. */
  showTrendLine?: boolean;
}

export interface ChartPoint {
  /** A number for a numeric axis column, a category label for a text one. */
  x: number | string;
  y: number | string;
  /** The bubble size column's value for this point; absent when not bound or not set on this row. */
  size?: number | null;
  tooltipLines: string[];
}

export interface ChartSeriesResult {
  label: string;
  points: ChartPoint[];
  /**
   * The id of the binding this series came from, stamped client-side when overlays
   * are merged (absent on a raw server response). The option builder resolves the
   * series' live presentation — its Y axis, colour, marker, and dash — from this
   * binding's current config, so appearance edits reflect without a refetch. A
   * binding that splits by colour contributes several series that share this id.
   */
  bindingId?: string;
  /** This series' least-squares fit, when requested and both axes are numeric/date. */
  trendLine?: TrendLine | null;
}

/**
 * A series' linear trend: the two endpoints to draw a line through (its fitted Y at the series'
 * min and max X), plus the fit's slope/intercept/R² should the client want to show them.
 */
export interface TrendLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
  intercept: number;
  /** The coefficient of determination (0..1) — how well the line fits the series' points. */
  rSquared: number;
}

export interface ResolvedToleranceBand {
  id: string;
  axis: ChartAxis;
  min: number | null;
  max: number | null;
  concessionLower: number | null;
  concessionUpper: number | null;
  /** Shade the zone between the lines. */
  fill: boolean;
  /** Outline plotted points that fall outside the band's outermost line. */
  outlinePoints: boolean;
}

/**
 * The row counts every chart response carries, so a chart can show the same "N of M rows" footer as
 * the table. Counted against the dataset before any per-chart narrowing (rows with no axis value,
 * rows with no measure).
 */
export interface ChartRowCounts {
  /** Every row in the dataset, ignoring the filter. */
  totalRowCount: number;
  /** The rows the filter matches; equals {@link totalRowCount} when there is no filter. */
  matchedRowCount: number;
  /** True when the server drew on only part of the matching rows (a point chart's point cap, a box plot's or histogram's scan cap). */
  truncated?: boolean;
  /** How many rows a capped scan (box plot, histogram) actually read; only meaningful with {@link truncated}. */
  scannedRowCount?: number;
}

/**
 * Set client-side when an overlay chart queries several bindings and some fail: the chart still
 * draws the ones that loaded, and this says how many it had to leave out.
 */
export interface PartialChartLoad {
  failedBindingCount?: number;
}

export interface ChartQueryResult extends ChartRowCounts, PartialChartLoad {
  id: string;
  name: string;
  series: ChartSeriesResult[];
  toleranceBands: ResolvedToleranceBand[];
  /** Total rows that matched before the server's point cap; equals the plotted count when not truncated. */
  totalPoints?: number;
}

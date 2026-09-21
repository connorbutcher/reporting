import { ChartAxis, ChartToleranceBand, ChartTooltipColumn } from '../report';
import { FilterGroup } from '../filter';

export interface ChartQueryRequest {
  filter: FilterGroup | null;
  xColumnId: string;
  yColumnId: string;
  seriesColumnId: string | null;
  toleranceBands: ChartToleranceBand[];
  tooltipColumns: ChartTooltipColumn[];
}

export interface ChartPoint {
  /** A number for a numeric axis column, a category label for a text one. */
  x: number | string;
  y: number | string;
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

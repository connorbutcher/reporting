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

export interface ChartQueryResult {
  id: string;
  name: string;
  series: ChartSeriesResult[];
  toleranceBands: ResolvedToleranceBand[];
  /** Total rows that matched before the server's point cap; equals the plotted count when not truncated. */
  totalPoints?: number;
  /** True when the server returned only a capped subset of the matching points. */
  truncated?: boolean;
}

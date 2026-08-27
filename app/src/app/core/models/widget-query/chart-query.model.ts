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
}

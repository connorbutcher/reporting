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

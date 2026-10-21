import { Coord } from './coord';
import { ScatterPoint } from './scatter-point';

export interface ScatterTooltipParams {
  value: [Coord, Coord];
  seriesName: string;
  seriesIndex: number;
  data: ScatterPoint;
}

import { Coord } from './coord';
import { ScatterPoint } from './scatter-point';

export type ScatterTooltipParams = {
  value: [Coord, Coord];
  seriesName: string;
  seriesIndex: number;
  data: ScatterPoint;
};

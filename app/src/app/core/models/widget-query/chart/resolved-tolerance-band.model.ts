import { ChartAxis } from '../../report';

export type ResolvedToleranceBand = {
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
};

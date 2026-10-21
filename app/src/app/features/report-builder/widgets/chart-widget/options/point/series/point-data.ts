import { ChartSeriesResult } from '../../../../../../../core/models/widget-query';
import { OutlineSeverity } from '../../marks/outline-severity';
import { Coord } from '../types/coord';
import { ScatterPoint } from '../types/scatter-point';

export class PointData {
  /** Outlined points also become triangles, so status isn't carried by colour alone. */
  public static points(
    series: ChartSeriesResult,
    color: string,
    outlineColor: (x: Coord, y: Coord) => string | null,
  ): ScatterPoint[] {
    return series.points.map((p) => {
      const border = outlineColor(p.x, p.y);
      return {
        value: [p.x, p.y],
        tooltipLines: p.tooltipLines,
        size: p.size,
        ...(border
          ? { symbol: 'triangle', itemStyle: OutlineSeverity.itemStyle(color, border) }
          : {}),
      };
    });
  }
}

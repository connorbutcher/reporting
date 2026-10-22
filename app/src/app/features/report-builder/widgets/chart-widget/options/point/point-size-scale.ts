import { ChartSeriesResult } from '../../../../../../core/models/widget-query';
import { ValueExtent } from '../axes/value-extent';
import { SizeScale } from './types/size-scale';

/** Bubble sizing for scatter points with a bound size column. */
export class PointSizeScale {
  // Unsized points keep the chart's fixed pointSize.
  private static readonly MIN_BUBBLE_PX = 8;
  private static readonly MAX_BUBBLE_PX = 40;

  /**
   * A scale fitted to every bound size value across every series, or null when none. Diameter
   * grows with the square root so bubble area tracks the value.
   */
  public static fit(
    series: readonly ChartSeriesResult[],
    fallbackPointSize: number,
  ): SizeScale | null {
    const extent = ValueExtent.of(series.flatMap((s) => s.points.map((p) => p.size)));
    if (!extent) {
      return null;
    }
    const { min, max } = extent;
    const { MIN_BUBBLE_PX, MAX_BUBBLE_PX } = PointSizeScale;
    return (size) => {
      if (typeof size !== 'number') {
        return fallbackPointSize;
      }
      if (max === min) {
        return (MIN_BUBBLE_PX + MAX_BUBBLE_PX) / 2;
      }
      const t = (size - min) / (max - min);
      return MIN_BUBBLE_PX + Math.sqrt(t) * (MAX_BUBBLE_PX - MIN_BUBBLE_PX);
    };
  }
}

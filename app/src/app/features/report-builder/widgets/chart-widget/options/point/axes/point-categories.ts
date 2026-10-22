import { ChartSeriesResult } from '../../../../../../../core/models/widget-query';

export class PointCategories {
  /** A text axis's categories, in first-appearance order (the server already applied the sort). */
  public static of(series: readonly ChartSeriesResult[], axis: 'x' | 'y'): string[] {
    const values = new Set<string>();
    for (const s of series) {
      for (const point of s.points) {
        values.add(String(axis === 'x' ? point.x : point.y));
      }
    }
    return [...values];
  }
}

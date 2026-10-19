import { DataZoomComponentOption } from 'echarts/components';

/**
 * Zoom for a grouping chart's category axis. A chart with many categories gets a slider plus
 * wheel/drag zoom along the category axis, so a high-cardinality column stays readable; a short
 * axis needs none and keeps its margin.
 */
export class CategoryZoom {
  /** Categories past which the zoom slider is offered. */
  public static readonly THRESHOLD = 20;

  public static enabled(zoom: boolean | undefined, categoryCount: number): boolean {
    return (zoom ?? true) && categoryCount > CategoryZoom.THRESHOLD;
  }

  /** The zoom entries for a category axis on X (vertical charts) or Y (horizontal ones). */
  public static dataZoom(horizontal: boolean): DataZoomComponentOption[] {
    return horizontal
      ? [
          { type: 'inside', yAxisIndex: 0 },
          { type: 'slider', yAxisIndex: 0, width: 16, right: 8 },
        ]
      : [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, height: 20, bottom: 12 },
        ];
  }
}

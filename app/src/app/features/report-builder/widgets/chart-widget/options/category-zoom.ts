import { DataZoomComponentOption } from 'echarts/components';

/** A slider plus wheel/drag zoom for long category axes. */
export class CategoryZoom {
  public static readonly THRESHOLD = 20;

  public static enabled(zoom: boolean | undefined, categoryCount: number): boolean {
    return (zoom ?? true) && categoryCount > CategoryZoom.THRESHOLD;
  }

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

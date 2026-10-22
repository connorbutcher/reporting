import type { ScatterSeriesOption } from 'echarts/charts';
import { BoxChart } from '../box-chart';
import { BoxSeries } from '../box-series';

export class BoxPointOverlay {
  /** Each box's raw values, jittered across its category. */
  public static build(chart: BoxChart, s: BoxSeries): ScatterSeriesOption | null {
    if (!chart.showPoints) return null;
    const points: [number, number][] = [];
    s.result.boxes.forEach((box, c) => {
      box?.points.forEach((v, k) => {
        const jx = c + BoxPointOverlay.jitter(c * 1009 + k);
        points.push(chart.horizontal ? [v, jx] : [jx, v]);
      });
    });
    if (points.length === 0) return null;
    return {
      id: `points:${s.name}`,
      name: s.name,
      type: 'scatter',
      symbolSize: 4,
      itemStyle: { color: s.color, opacity: 0.5 },
      data: points,
    };
  }
  /** A stable pseudo-random offset of about ±0.17 of a category width. */
  private static jitter(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 0.34;
  }
}

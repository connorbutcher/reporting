import type { ScatterSeriesOption } from 'echarts/charts';
import { BoxChart } from '../box-chart';
import { BoxSeries } from '../box-series';

export class BoxMeanOverlay {
  /** A diamond at each box's mean, alongside its median line. */
  public static build(chart: BoxChart, s: BoxSeries): ScatterSeriesOption | null {
    if (!chart.config.showMean) return null;
    const means = s.result.boxes.flatMap((box, c) =>
      box ? [chart.horizontal ? [box.mean, c] : [c, box.mean]] : [],
    );
    if (means.length === 0) return null;
    return {
      id: `mean:${s.name}`,
      name: s.name,
      type: 'scatter',
      symbol: 'diamond',
      symbolSize: 11,
      itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 1 },
      data: means,
    };
  }
}

import type { ScatterSeriesOption } from 'echarts/charts';
import { BoxChart } from '../box-chart';
import { BoxSeries } from '../box-series';

export class BoxOutlierOverlay {
  /** Raw points already show every value, outliers included. */
  public static build(chart: BoxChart, s: BoxSeries): ScatterSeriesOption | null {
    if (chart.showPoints || s.result.outliers.length === 0) {
      return null;
    }
    return {
      id: `outlier:${s.name}`,
      name: s.name,
      type: 'scatter',
      symbolSize: 6,
      itemStyle: { color: s.color, opacity: 0.8 },
      data: s.result.outliers.map((o) =>
        chart.horizontal ? [o.value, o.categoryIndex] : [o.categoryIndex, o.value],
      ),
    };
  }
}

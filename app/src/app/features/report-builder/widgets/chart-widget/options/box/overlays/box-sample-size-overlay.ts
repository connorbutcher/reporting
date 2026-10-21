import type { ScatterSeriesOption } from 'echarts/charts';
import { BoxChart } from '../box-chart';
import { BoxSeries } from '../box-series';

export class BoxSampleSizeOverlay {
  /** An "n=" label above each box, with no marker or tooltip. */
  public static build(chart: BoxChart, s: BoxSeries): ScatterSeriesOption | null {
    if (!chart.config.showSampleSize) return null;
    const labels = s.result.boxes.flatMap((box, c) =>
      box
        ? [{ value: chart.horizontal ? [box.max, c] : [c, box.max], name: `n=${box.count}` }]
        : [],
    );
    if (labels.length === 0) return null;
    return {
      id: `n:${s.name}`,
      name: s.name,
      type: 'scatter',
      symbolSize: 0,
      tooltip: { show: false },
      label: {
        show: true,
        position: chart.horizontal ? 'right' : 'top',
        formatter: '{b}',
        fontSize: 10,
        color: '#64748b',
      },
      data: labels,
    };
  }}

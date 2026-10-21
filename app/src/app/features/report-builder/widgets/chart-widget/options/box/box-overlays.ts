import type { ScatterSeriesOption } from 'echarts/charts';
import { BoxChart } from './box-chart';
import { BoxSeries } from './box-series';

/** The scatter overlays drawn over each box series: raw points, outliers, means and sample sizes. */
export class BoxOverlays {
  /** Points sit behind the emphasis marks, so a small group's shape is visible. */
  public static all(chart: BoxChart): ScatterSeriesOption[] {
    return chart.series.flatMap((s) =>
      [
        BoxOverlays.points(chart, s),
        BoxOverlays.outliers(chart, s),
        BoxOverlays.means(chart, s),
        BoxOverlays.sampleSizes(chart, s),
      ].filter((o): o is ScatterSeriesOption => o !== null),
    );
  }

  /** Each box's raw values, jittered across its category. */
  private static points(chart: BoxChart, s: BoxSeries): ScatterSeriesOption | null {
    if (!chart.showPoints) return null;
    const points: [number, number][] = [];
    s.result.boxes.forEach((box, c) => {
      box?.points.forEach((v, k) => {
        const jx = c + BoxOverlays.jitter(c * 1009 + k);
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

  /** Raw points already show every value, outliers included. */
  private static outliers(chart: BoxChart, s: BoxSeries): ScatterSeriesOption | null {
    if (chart.showPoints || s.result.outliers.length === 0) return null;
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

  /** A diamond at each box's mean, alongside its median line. */
  private static means(chart: BoxChart, s: BoxSeries): ScatterSeriesOption | null {
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

  /** An "n=" label above each box, with no marker or tooltip. */
  private static sampleSizes(chart: BoxChart, s: BoxSeries): ScatterSeriesOption | null {
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
  }

  /** A stable pseudo-random offset of about ±0.17 of a category width. */
  private static jitter(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 0.34;
  }
}

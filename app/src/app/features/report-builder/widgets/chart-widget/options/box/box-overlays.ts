import type { ScatterSeriesOption } from 'echarts/charts';
import { BoxChart } from './box-chart';
import { BoxMeanOverlay } from './overlays/box-mean-overlay';
import { BoxOutlierOverlay } from './overlays/box-outlier-overlay';
import { BoxPointOverlay } from './overlays/box-point-overlay';
import { BoxSampleSizeOverlay } from './overlays/box-sample-size-overlay';

/** The scatter overlays drawn over each box series: raw points, outliers, means and sample sizes. */
export class BoxOverlays {
  /** Points sit behind the emphasis marks, so a small group's shape is visible. */
  public static all(chart: BoxChart): ScatterSeriesOption[] {
    return chart.series.flatMap((s) =>
      [
        BoxPointOverlay.build(chart, s),
        BoxOutlierOverlay.build(chart, s),
        BoxMeanOverlay.build(chart, s),
        BoxSampleSizeOverlay.build(chart, s),
      ].filter((o): o is ScatterSeriesOption => o !== null),
    );
  }
}

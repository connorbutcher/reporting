import type { LineSeriesOption } from 'echarts/charts';
import { GuideLineMarks } from '../marks/guide-line-marks';
import { ReferenceSeries } from '../marks/reference-series';
import { ToleranceMarks } from '../marks/tolerance-marks';
import { AxisKey } from '../types/axis-key';
import { HistogramBinAxis } from './histogram-bin-axis';
import { HistogramChart } from './histogram-chart';

/** Spec bands and guide lines on the binned variable, drawn across the bins. */
export class HistogramMarks {
  public static reference(chart: HistogramChart): LineSeriesOption | null {
    const bands = HistogramBinAxis.bands(chart.data?.toleranceBands ?? [], chart.bins);
    const lines = HistogramBinAxis.guideLines(chart.config.guideLines ?? [], chart.bins);
    const axis: AxisKey = chart.horizontal ? 'yAxis' : 'xAxis';
    return ReferenceSeries.build(
      [...ToleranceMarks.lines(bands, () => axis), ...GuideLineMarks.lines(lines, () => axis)],
      [...ToleranceMarks.areas(bands, () => axis), ...GuideLineMarks.areas(lines, () => axis)],
    );
  }
}

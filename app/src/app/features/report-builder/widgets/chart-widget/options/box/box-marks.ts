import type { LineSeriesOption } from 'echarts/charts';
import { GuideLineMarks } from '../marks/guide-line-marks';
import { GuideLineOutline } from '../marks/guide-line-outline';
import { OutlineSeverity } from '../marks/outline-severity';
import { ReferenceSeries } from '../marks/reference-series';
import { ToleranceMarks } from '../marks/tolerance-marks';
import { ToleranceOutline } from '../marks/tolerance-outline';
import { AxisKey } from '../types/axis-key';
import { BoxChart } from './box-chart';

/** Tolerance bands and guide lines on a box plot's value axis. */
export class BoxMarks {
  public static reference(chart: BoxChart): LineSeriesOption | null {
    const bands = chart.data?.toleranceBands ?? [];
    const guideLines = chart.config.guideLines ?? [];
    const axis: AxisKey = chart.horizontal ? 'xAxis' : 'yAxis';
    return ReferenceSeries.build(
      [...ToleranceMarks.lines(bands, () => axis), ...GuideLineMarks.lines(guideLines, () => axis)],
      [...ToleranceMarks.areas(bands, () => axis), ...GuideLineMarks.areas(guideLines, () => axis)],
    );
  }

  /** The border colour for a box whose whiskers breach an outlined band or guide line. */
  public static outlineColor(chart: BoxChart): (min: number, max: number) => string | null {
    return OutlineSeverity.forExtent([
      ...ToleranceOutline.zonesFor(chart.data?.toleranceBands ?? []),
      ...GuideLineOutline.zonesFor(chart.config.guideLines ?? []),
    ]);
  }
}

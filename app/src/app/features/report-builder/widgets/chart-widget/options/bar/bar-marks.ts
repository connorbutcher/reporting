import type { LineSeriesOption } from 'echarts/charts';
import { AxisKey } from '../types/axis-key';
import { GuideLineMarks } from '../marks/guide-line-marks';
import { GuideLineOutline } from '../marks/guide-line-outline';
import { OutlineSeverity } from '../marks/outline-severity';
import { ReferenceSeries } from '../marks/reference-series';
import { ToleranceMarks } from '../marks/tolerance-marks';
import { ToleranceOutline } from '../marks/tolerance-outline';
import { BarChart } from './bar-chart';

/** Tolerance bands and guide lines on a bar chart's value axis. */
export class BarMarks {
  /** The carrier series for reference lines and zones, or null when there are none. */
  public static reference(chart: BarChart): LineSeriesOption | null {
    const bands = BarMarks.bands(chart);
    const guideLines = BarMarks.guideLines(chart);
    const axis = BarMarks.valueAxisKey(chart);
    return ReferenceSeries.build(
      [...ToleranceMarks.lines(bands, () => axis), ...GuideLineMarks.lines(guideLines, () => axis)],
      [...ToleranceMarks.areas(bands, () => axis), ...GuideLineMarks.areas(guideLines, () => axis)],
    );
  }

  /** The border colour for a bar outside an outlined band or guide line. */
  public static outlineColor(chart: BarChart): (value: number) => string | null {
    return OutlineSeverity.forValue([
      ...ToleranceOutline.zonesFor(BarMarks.bands(chart)),
      ...GuideLineOutline.zonesFor(BarMarks.guideLines(chart)),
    ]);
  }

  /** Percent bars aren't on the measure's scale, so reference marks don't apply to them. */
  private static bands(chart: BarChart) {
    return chart.percent ? [] : (chart.data?.toleranceBands ?? []);
  }

  private static guideLines(chart: BarChart) {
    return chart.percent ? [] : (chart.config.guideLines ?? []);
  }

  private static valueAxisKey(chart: BarChart): AxisKey {
    return chart.horizontal ? 'xAxis' : 'yAxis';
  }
}

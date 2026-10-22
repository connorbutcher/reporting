import type { LineSeriesOption } from 'echarts/charts';
import { GuideLineMarks } from '../marks/guide-line-marks';
import { ReferenceSeries } from '../marks/reference-series';
import { ToleranceMarks } from '../marks/tolerance-marks';
import { XBarRChart } from './xbar-r-chart';
import { XBarRColors } from './xbar-r-colors';

/** Spec limits, value-axis guide lines and the baseline marker, on the top chart only. */
export class XBarRMarks {
  public static reference(chart: XBarRChart): LineSeriesOption | null {
    const bands = (chart.data?.toleranceBands ?? []).filter((b) => b.axis === 'y');
    const guideLines = (chart.config.guideLines ?? []).filter((l) => l.axis === 'y');
    return ReferenceSeries.build(
      [
        // UCL, CL and LCL label the right-hand end, so spec labels take the left.
        ...ToleranceMarks.lines(bands, () => 'yAxis', 'start'),
        ...GuideLineMarks.lines(guideLines, () => 'yAxis'),
        ...XBarRMarks.baseline(chart),
      ],
      [
        ...ToleranceMarks.areas(bands, () => 'yAxis'),
        ...GuideLineMarks.areas(guideLines, () => 'yAxis'),
      ],
      { xAxisIndex: 0, yAxisIndex: 0 },
    );
  }

  /** A dotted marker after the last baseline subgroup shows the limits are held from it. */
  private static baseline(chart: XBarRChart) {
    const count = chart.data?.baselineCount ?? null;
    if (count == null || count <= 0 || count >= chart.categories.length) {
      return [];
    }
    return [
      {
        xAxis: count - 1,
        lineStyle: { color: XBarRColors.CENTER_LINE, type: 'dotted' as const, width: 1.25 },
        label: {
          formatter: 'Limits baseline',
          position: 'insideEndTop' as const,
          color: XBarRColors.CENTER_LINE,
          fontSize: 10,
        },
      },
    ];
  }
}

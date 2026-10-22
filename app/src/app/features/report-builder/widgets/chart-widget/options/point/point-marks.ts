import type { LineSeriesOption } from 'echarts/charts';
import { ChartGuideLine, ChartConfigs } from '../../../../../../core/models/report';
import { ResolvedToleranceBand } from '../../../../../../core/models/widget-query';
import { GuideLineMarks } from '../marks/guide-line-marks';
import { GuideLineOutline } from '../marks/guide-line-outline';
import { OutlineSeverity } from '../marks/outline-severity';
import { ReferenceSeries } from '../marks/reference-series';
import { ToleranceMarks } from '../marks/tolerance-marks';
import { ToleranceOutline } from '../marks/tolerance-outline';
import { AxisKey } from '../types/axis-key';
import { PointChart } from './point-chart';
import { Coord } from './types/coord';

/** Tolerance bands and guide lines per Y axis; X marks group with the primary. */
export class PointMarks {
  /** One carrier series per Y axis with marks, so hiding a data series keeps them. */
  public static references(chart: PointChart): LineSeriesOption[] {
    return chart.axes.flatMap((_, k) => {
      const bands = PointMarks.bands(chart).filter((b) => PointMarks.bandAxis(chart, b) === k);
      const lines = PointMarks.guideLines(chart).filter((l) => PointMarks.lineAxis(chart, l) === k);
      const reference = ReferenceSeries.build(
        [
          ...ToleranceMarks.lines(bands, PointMarks.axisKeyOf),
          ...GuideLineMarks.lines(lines, PointMarks.axisKeyOf),
        ],
        [
          ...ToleranceMarks.areas(bands, PointMarks.axisKeyOf),
          ...GuideLineMarks.areas(lines, PointMarks.axisKeyOf),
        ],
        chart.multiAxis ? { yAxisIndex: k } : {},
      );
      return reference ? [reference] : [];
    });
  }

  /**
   * The outline colour for a point on the given Y axis, tested against X marks and that axis's
   * marks. Colour-by-value drives the fill, so it never outlines.
   */
  public static outlineColor(
    chart: PointChart,
    axisIndex: number,
  ): (x: Coord, y: Coord) => string | null {
    if (chart.colorByValue) {
      return () => null;
    }
    return OutlineSeverity.forPoints([
      ...ToleranceOutline.zonesFor(
        PointMarks.bands(chart).filter(
          (b) => b.axis === 'x' || PointMarks.bandAxis(chart, b) === axisIndex,
        ),
      ),
      ...GuideLineOutline.zonesFor(
        PointMarks.guideLines(chart).filter(
          (l) => l.axis === 'x' || PointMarks.lineAxis(chart, l) === axisIndex,
        ),
      ),
    ]);
  }

  private static bands(chart: PointChart): ResolvedToleranceBand[] {
    return chart.data?.toleranceBands ?? [];
  }

  private static guideLines(chart: PointChart): ChartGuideLine[] {
    return chart.config.guideLines ?? [];
  }

  /** Resolved bands lose their Y axis, so read it from the config; X bands group with the primary. */
  private static bandAxis(chart: PointChart, band: ResolvedToleranceBand): number {
    if (band.axis === 'x') {
      return 0;
    }
    const yAxisIds = new Map(chart.config.toleranceBands.map((b) => [b.id, b.yAxisId ?? null]));
    return ChartConfigs.axisIndex(chart.axes, yAxisIds.get(band.id) ?? null);
  }

  private static lineAxis(chart: PointChart, line: ChartGuideLine): number {
    return line.axis === 'x' ? 0 : ChartConfigs.axisIndex(chart.axes, line.yAxisId ?? null);
  }

  private static axisKeyOf(item: { axis: 'x' | 'y' }): AxisKey {
    return item.axis === 'x' ? 'xAxis' : 'yAxis';
  }
}

import type { LineSeriesOption } from 'echarts/charts';
import { ChartConfigs } from '../../../../../../core/models/report';
import { GuideLineMarks } from '../marks/guide-line-marks';
import { GuideLineOutline } from '../marks/guide-line-outline';
import { OutlineSeverity } from '../marks/outline-severity';
import { ReferenceSeries } from '../marks/reference-series';
import { ToleranceMarks } from '../marks/tolerance-marks';
import { ToleranceOutline } from '../marks/tolerance-outline';
import { ComboChart } from './combo-chart';

/**
 * Tolerance bands and guide lines per value axis. Combo marks always sit on a value axis, since
 * the category axis is never numeric.
 */
export class ComboMarks {
  /** One carrier series per axis with marks, so hiding a data series keeps them. */
  public static references(chart: ComboChart): LineSeriesOption[] {
    const references: LineSeriesOption[] = [];
    for (const k of chart.axes.keys()) {
      const bands = ComboMarks.bandsOn(chart, k);
      const lines = ComboMarks.guideLinesOn(chart, k);
      const reference = ReferenceSeries.build(
        [
          ...ToleranceMarks.lines(bands, () => 'yAxis'),
          ...GuideLineMarks.lines(lines, () => 'yAxis'),
        ],
        [
          ...ToleranceMarks.areas(bands, () => 'yAxis'),
          ...GuideLineMarks.areas(lines, () => 'yAxis'),
        ],
        chart.multiAxis ? { yAxisIndex: k } : {},
      );
      if (reference) {
        references.push(reference);
      }
    }
    return references;
  }

  /** The bar border colour for a value outside an outlined mark on the given axis. */
  public static outlineColor(
    chart: ComboChart,
    axisIndex: number,
  ): (value: number) => string | null {
    if (!chart.axes[axisIndex]) {
      return OutlineSeverity.forValue([]);
    }
    return OutlineSeverity.forValue([
      ...ToleranceOutline.zonesFor(ComboMarks.bandsOn(chart, axisIndex)),
      ...GuideLineOutline.zonesFor(ComboMarks.guideLinesOn(chart, axisIndex)),
    ]);
  }

  private static bandsOn(chart: ComboChart, axisIndex: number) {
    const { config, axes } = chart;
    const yAxisIds = new Map(config.toleranceBands.map((b) => [b.id, b.yAxisId ?? null]));
    return (chart.data?.toleranceBands ?? []).filter(
      (b) =>
        b.axis === 'y' && ChartConfigs.axisIndex(axes, yAxisIds.get(b.id) ?? null) === axisIndex,
    );
  }

  private static guideLinesOn(chart: ComboChart, axisIndex: number) {
    return (chart.config.guideLines ?? []).filter(
      (l) => l.axis === 'y' && ChartConfigs.axisIndex(chart.axes, l.yAxisId ?? null) === axisIndex,
    );
  }
}

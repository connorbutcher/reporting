import { ChartGuideLine } from '../../../../../../core/models/report';
import { AxisKey } from '../types/axis-key';
import { MarkAxis } from './mark-axis';
import { AxisKeyFor } from './types/axis-key-for';
import { MarkAreaData } from './types/mark-area-data';
import { MarkLineData } from './types/mark-line-data';

/** Reference lines and optional shaded regions from fixed values: the simpler tolerance band. */
export class GuideLineMarks {
  // Neutral, so guide lines read differently from tolerance's red and amber.
  private static readonly DEFAULT_COLOR = '#4f46e5';
  private static readonly DEFAULT_FILL = 'rgba(79, 70, 229, 0.10)';

  /** One dashed line per edge: one for a value, two for a `valueTo` region. */
  public static lines(
    lines: readonly ChartGuideLine[],
    axisKeyFor: AxisKeyFor<Pick<ChartGuideLine, 'axis'>>,
  ): MarkLineData {
    return lines.flatMap((line) => GuideLineMarks.edges(line, axisKeyFor(line)));
  }

  public static areas(
    lines: readonly ChartGuideLine[],
    axisKeyFor: AxisKeyFor<Pick<ChartGuideLine, 'axis'>>,
  ): MarkAreaData {
    return lines.flatMap((line) =>
      line.fill && GuideLineMarks.hasRegion(line)
        ? [GuideLineMarks.region(line, axisKeyFor(line))]
        : [],
    );
  }

  private static edges(line: ChartGuideLine, axisKey: AxisKey): MarkLineData {
    const color = line.color ?? GuideLineMarks.DEFAULT_COLOR;
    const label = line.label.trim() || GuideLineMarks.formatValue(line.value);
    const values = GuideLineMarks.hasRegion(line) ? [line.value, line.valueTo!] : [line.value];
    return values.map((value) => ({
      ...MarkAxis.at(axisKey, value),
      label: { formatter: label, position: 'insideEndTop', color, fontSize: 10 },
      lineStyle: { color, type: line.dashStyle ?? 'dashed', width: 1.5 },
    }));
  }

  private static region(line: ChartGuideLine, axisKey: AxisKey): MarkAreaData[number] {
    return [
      { ...MarkAxis.at(axisKey, line.value), itemStyle: { color: GuideLineMarks.DEFAULT_FILL } },
      MarkAxis.at(axisKey, line.valueTo!),
    ];
  }

  private static hasRegion(line: ChartGuideLine): boolean {
    return line.valueTo !== null && line.valueTo !== undefined;
  }

  private static formatValue(value: number): string {
    return Number.isFinite(value) ? String(value) : '';
  }
}

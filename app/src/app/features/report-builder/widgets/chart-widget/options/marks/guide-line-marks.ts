import { ChartGuideLine } from '../../../../../../core/models/report';
import { MarkAreaData } from './types/mark-area-data';
import { MarkLineData } from './types/mark-line-data';
import { AxisKey } from '../types/axis-key';
import { AxisKeyFor } from './types/axis-key-for';

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
    const entries: MarkLineData = [];

    for (const line of lines) {
      const axisKey = axisKeyFor(line);
      const color = line.color ?? GuideLineMarks.DEFAULT_COLOR;
      const label = line.label.trim() || GuideLineMarks.formatValue(line.value);

      const values =
        line.valueTo !== null && line.valueTo !== undefined
          ? [line.value, line.valueTo]
          : [line.value];
      for (const value of values) {
        entries.push({
          ...GuideLineMarks.onAxis(axisKey, value),
          label: { formatter: label, position: 'insideEndTop', color, fontSize: 10 },
          lineStyle: { color, type: line.dashStyle ?? 'dashed', width: 1.5 },
        });
      }
    }

    return entries;
  }

  public static areas(
    lines: readonly ChartGuideLine[],
    axisKeyFor: AxisKeyFor<Pick<ChartGuideLine, 'axis'>>,
  ): MarkAreaData {
    const areas: MarkAreaData = [];

    for (const line of lines) {
      if (!line.fill || line.valueTo === null || line.valueTo === undefined) continue;

      const axisKey = axisKeyFor(line);
      areas.push([
        {
          ...GuideLineMarks.onAxis(axisKey, line.value),
          itemStyle: { color: GuideLineMarks.DEFAULT_FILL },
        },
        GuideLineMarks.onAxis(axisKey, line.valueTo),
      ]);
    }

    return areas;
  }

  /** A typed `{ xAxis }` or `{ yAxis }` fragment. */
  private static onAxis(axisKey: AxisKey, value: number): { xAxis: number } | { yAxis: number } {
    return axisKey === 'xAxis' ? { xAxis: value } : { yAxis: value };
  }

  private static formatValue(value: number): string {
    return Number.isFinite(value) ? String(value) : '';
  }
}

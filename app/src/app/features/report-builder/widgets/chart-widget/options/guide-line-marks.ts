import { ChartGuideLine } from '../../../../../core/models/report';
import { MarkAreaData } from './types/mark-area-data';
import { MarkLineData } from './types/mark-line-data';
import { AxisKey } from './types/axis-key';
import { AxisKeyFor } from './types/axis-key-for';

/** Reference lines (and optional shaded regions) drawn from fixed values and their captions — the simpler alternative to a tolerance band. */
export class GuideLineMarks {
  // A neutral tone, deliberately distinct from tolerance's red/amber so the two kinds of line
  // read as different things at a glance.
  private static readonly DEFAULT_COLOR = '#4f46e5';
  // Translucent, in the same indigo family as the default line colour, so a shaded guide
  // region reads as "the same kind of thing" as a plain guide line rather than a spec band.
  private static readonly DEFAULT_FILL = 'rgba(79, 70, 229, 0.10)';

  /**
   * One dashed line entry per guide line edge — one for a single value, two (start and end,
   * both captioned) when `valueTo` turns it into a region.
   */
  public static lines(
    lines: readonly ChartGuideLine[],
    axisKeyFor: AxisKeyFor<Pick<ChartGuideLine, 'axis'>>,
  ): MarkLineData {
    const entries: MarkLineData = [];

    for (const line of lines) {
      const axisKey = axisKeyFor(line);
      const color = line.color ?? GuideLineMarks.DEFAULT_COLOR;
      const label = line.label.trim() || GuideLineMarks.formatValue(line.value);

      const mark = (value: number): MarkLineData[number] => ({
        ...GuideLineMarks.onAxis(axisKey, value),
        label: { formatter: label, position: 'insideEndTop', color, fontSize: 10 },
        lineStyle: { color, type: line.dashStyle ?? 'dashed', width: 1.5 },
      });

      entries.push(mark(line.value));
      if (line.valueTo !== null && line.valueTo !== undefined) entries.push(mark(line.valueTo));
    }

    return entries;
  }

  /** Shaded regions for every guide line that has a `valueTo` and `fill` on. */
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

  /** Pins a value to the chosen axis as a typed `{ xAxis }` or `{ yAxis }` fragment. */
  private static onAxis(axisKey: AxisKey, value: number): { xAxis: number } | { yAxis: number } {
    return axisKey === 'xAxis' ? { xAxis: value } : { yAxis: value };
  }

  private static formatValue(value: number): string {
    return Number.isFinite(value) ? String(value) : '';
  }
}

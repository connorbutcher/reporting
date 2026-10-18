import { ChartGuideLine } from '../../../../../core/models/report';
import { MarkLineData } from './chart-option.types';

/** Which axis a line's marks bind to — chosen by the caller (a bar's value axis flips with orientation). */
type AxisKeyFor = (line: Pick<ChartGuideLine, 'axis'>) => 'xAxis' | 'yAxis';

type AxisKey = 'xAxis' | 'yAxis';

// A neutral tone, deliberately distinct from tolerance's red/amber so the two kinds of line
// read as different things at a glance.
const DEFAULT_COLOR = '#4f46e5';

/** Reference lines drawn from fixed values and their captions — the simpler alternative to a tolerance band. */
export class GuideLineMarks {
  /** One dashed line entry per guide line, captioned with its label (or the formatted value if blank). */
  public static lines(lines: readonly ChartGuideLine[], axisKeyFor: AxisKeyFor): MarkLineData {
    const entries: MarkLineData = [];

    for (const line of lines) {
      const axisKey = axisKeyFor(line);
      const color = line.color ?? DEFAULT_COLOR;
      const label = line.label.trim() || GuideLineMarks.formatValue(line.value);

      entries.push({
        ...GuideLineMarks.onAxis(axisKey, line.value),
        label: { formatter: label, position: 'insideEndTop', color, fontSize: 10 },
        lineStyle: { color, type: line.dashStyle ?? 'dashed', width: 1.5 },
      });
    }

    return entries;
  }

  /** Pins a value to the chosen axis as a typed `{ xAxis }` or `{ yAxis }` fragment. */
  private static onAxis(axisKey: AxisKey, value: number): { xAxis: number } | { yAxis: number } {
    return axisKey === 'xAxis' ? { xAxis: value } : { yAxis: value };
  }

  private static formatValue(value: number): string {
    return Number.isFinite(value) ? String(value) : '';
  }
}

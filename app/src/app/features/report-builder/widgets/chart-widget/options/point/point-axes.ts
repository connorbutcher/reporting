import { DateColumnConfig, NumericColumnConfig } from '../../../../../../core/models/dataset';
import { ChartSeriesResult } from '../../../../../../core/models/widget-query';
import type { YAXisComponentOption } from 'echarts';
import { ChartFormat } from '../format/chart-format';
import { ChartScale } from '../axes/chart-scale';
import { PointChartConstants } from './point-chart-constants';
import { YAxesInput } from './types/y-axes-input';

export class PointAxes {
  /**
   * One axis per configured Y axis. The primary's type comes from its column; a secondary's is
   * inferred from its values. Secondary axes are offset, and a single-series axis takes its colour.
   */
  public static buildY(input: YAxesInput): YAXisComponentOption[] {
    const { axes, series, indicesByAxis, seriesColors, yLabel, yConfig, yDateCfg } = input;
    const multiAxis = axes.length > 1;
    const sideOrder: Record<'left' | 'right', number> = { left: 0, right: 0 };

    return axes.map((axis, k): YAXisComponentOption => {
      const isPrimary = k === 0;
      const orderOnSide = sideOrder[axis.side]++;
      const onAxis = indicesByAxis.get(k) ?? [];
      const isDate = isPrimary && input.yPrimaryIsDate;
      const axisSeries = onAxis.map((i) => series[i]);
      const isText = isPrimary ? input.yPrimaryIsText : PointAxes.firstPointIsText(axisSeries);
      const cats = isText ? PointAxes.categories(axisSeries, 'y') : null;
      const axisColor = multiAxis && onAxis.length === 1 ? seriesColors[onAxis[0]] : null;
      const scale = isDate
        ? ChartScale.dateAxis(yDateCfg)
        : isText
          ? ChartScale.categoryAxis(cats ?? [], axis.interval)
          : ChartScale.numericAxis(
              axis.logScale,
              axis.min,
              axis.max,
              axis.interval,
              isPrimary ? yConfig : undefined,
              axis.scale,
            );
      const rotate = ChartScale.labelRotate(axis.rotate);
      const longest = isText
        ? ChartScale.longestLen(cats ?? [])
        : PointAxes.valueLabelLen(axisSeries, isDate, isPrimary ? yConfig : undefined, yDateCfg);
      return {
        ...scale,
        ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
        name: isPrimary ? yLabel : axis.label.trim(),
        nameLocation: 'middle',
        nameGap: ChartScale.nameGap(longest, rotate, 'y'),
        ...(axisColor ? { nameTextStyle: { color: axisColor } } : {}),
        position: axis.side,
        ...(orderOnSide > 0 ? { offset: orderOnSide * PointChartConstants.AXIS_OFFSET } : {}),
        ...(!isPrimary || axisColor
          ? { axisLine: { show: true, ...(axisColor ? { lineStyle: { color: axisColor } } : {}) } }
          : {}),
        // Gridlines ride the primary only, so stacked scales don't compete.
        splitLine: { show: isPrimary && input.showGridLines },
      };
    });
  }

  /** A text axis's categories, in first-appearance order (the server already applied the sort). */
  public static categories(series: ChartSeriesResult[], axis: 'x' | 'y'): string[] {
    const values = new Set<string>();
    for (const s of series) {
      for (const point of s.points) values.add(String(axis === 'x' ? point.x : point.y));
    }
    return [...values];
  }

  /** The longest tick label, estimated by formatting the data extent, to size the name gap. */
  private static valueLabelLen(
    seriesForAxis: ChartSeriesResult[],
    isDate: boolean,
    config: NumericColumnConfig | undefined,
    dateCfg: DateColumnConfig | undefined,
  ): number {
    let min = Infinity;
    let max = -Infinity;
    for (const s of seriesForAxis) {
      for (const p of s.points) {
        if (typeof p.y === 'number') {
          if (p.y < min) min = p.y;
          if (p.y > max) max = p.y;
        }
      }
    }
    if (!Number.isFinite(min)) return 0;
    const format = isDate
      ? (v: number) => ChartFormat.date(v, dateCfg)
      : (v: number) => ChartFormat.numeric(v, config);
    return Math.max(format(min).length, format(max).length);
  }

  private static firstPointIsText(seriesForAxis: ChartSeriesResult[]): boolean {
    for (const s of seriesForAxis) {
      const p = s.points[0];
      if (p) return typeof p.y === 'string';
    }
    return false;
  }
}

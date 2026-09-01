import { DateColumnConfig, NumericColumnConfig } from '../../../../../core/models/dataset';
import { ChartValueAxis } from '../../../../../core/models/report';
import { ChartSeriesResult } from '../../../../../core/models/widget-query';
import { YAXisComponentOption } from './chart-option.types';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { AXIS_OFFSET } from './point-types';

/** Everything {@link PointAxes.buildY} needs about the plotted data and the primary column. */
export interface YAxesInput {
  axes: readonly ChartValueAxis[];
  series: ChartSeriesResult[];
  /** Series indices grouped by the Y axis they plot on. */
  indicesByAxis: Map<number, number[]>;
  seriesColors: string[];
  /** The primary axis's resolved label; secondary axes use their own. */
  yLabel: string;
  yConfig: NumericColumnConfig | undefined;
  yDateCfg: DateColumnConfig | undefined;
  yPrimaryIsText: boolean;
  yPrimaryIsDate: boolean;
}

/** Builds the Y axis definitions for a point chart, and the category labels a text axis carries. */
export class PointAxes {
  /**
   * One echarts axis per configured Y axis. Secondary axes are offset so their scales don't
   * overlap; the primary takes its type from the bound column (works with no data), a secondary
   * is inferred from its series' values (so it too can be a category axis). An axis carrying a
   * single series is drawn in that series' colour so a reader can tell which scale it reads against.
   */
  public static buildY(input: YAxesInput): YAXisComponentOption[] {
    const { axes, series, indicesByAxis, seriesColors, yLabel, yConfig, yDateCfg } = input;
    const multiAxis = axes.length > 1;
    const seriesOnAxis = (k: number) => (indicesByAxis.get(k) ?? []).map((i) => series[i]);
    const sideOrder: Record<'left' | 'right', number> = { left: 0, right: 0 };

    return axes.map((axis, k): YAXisComponentOption => {
      const isPrimary = k === 0;
      const orderOnSide = sideOrder[axis.side]++;
      const onAxis = indicesByAxis.get(k) ?? [];
      const isDate = isPrimary && input.yPrimaryIsDate;
      const axisSeries = seriesOnAxis(k);
      const isText = isPrimary ? input.yPrimaryIsText : PointAxes.firstPointIsText(axisSeries);
      const cats = isText ? PointAxes.categories(axisSeries, 'y') : null;
      const axisColor = multiAxis && onAxis.length === 1 ? seriesColors[onAxis[0]] : null;
      // The category labels live inside the scale fragment so the axis `type` and its `data`
      // stay correlated in one branch.
      const scale = isDate
        ? ChartScale.dateAxis(yDateCfg)
        : isText
          ? ChartScale.categoryAxis(cats ?? [], axis.interval)
          : ChartScale.numericAxis(axis.logScale, axis.min, axis.max, axis.interval, isPrimary ? yConfig : undefined);
      const rotate = ChartScale.labelRotate(axis.rotate);
      // Size the name's gap to clear this axis's own tick labels so the two never overlap.
      const longest = isText
        ? ChartScale.longestLen(cats ?? [])
        : PointAxes.valueLabelLen(axisSeries, isDate, isPrimary ? yConfig : undefined, yDateCfg);
      return {
        ...scale,
        // Only override the label config for a non-default rotation, so the scale's own
        // formatter is otherwise left untouched.
        ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
        name: isPrimary ? yLabel : axis.label.trim(),
        nameLocation: 'middle',
        nameGap: ChartScale.nameGap(longest, rotate, 'y'),
        ...(axisColor ? { nameTextStyle: { color: axisColor } } : {}),
        position: axis.side,
        ...(orderOnSide > 0 ? { offset: orderOnSide * AXIS_OFFSET } : {}),
        // Secondary axes show their line to anchor the added scale; a single-series axis is
        // drawn in that series' colour. Split lines stay on the primary to avoid competing grids.
        ...(!isPrimary || axisColor
          ? { axisLine: { show: true, ...(axisColor ? { lineStyle: { color: axisColor } } : {}) } }
          : {}),
        ...(isPrimary ? {} : { splitLine: { show: false } }),
      };
    });
  }

  /** The distinct category labels a text axis carries, alphabetical — the axis's `data`. */
  public static categories(series: ChartSeriesResult[], axis: 'x' | 'y'): string[] {
    const values = new Set<string>();
    for (const s of series) {
      for (const point of s.points) values.add(String(axis === 'x' ? point.x : point.y));
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }

  /**
   * The longest tick label a numeric/date Y axis will show, in characters, from its series' data
   * extent (min & max) — enough to size a non-overlapping {@link ChartScale.nameGap} without
   * knowing echarts' chosen ticks.
   */
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

  /** Whether a group of series plots text (category) values on its Y axis, from the first point present. */
  private static firstPointIsText(seriesForAxis: ChartSeriesResult[]): boolean {
    for (const s of seriesForAxis) {
      const p = s.points[0];
      if (p) return typeof p.y === 'string';
    }
    return false;
  }
}

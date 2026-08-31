import { DateColumnConfig, NumericColumnConfig } from '../../../../../core/models/dataset';
import { ChartValueAxis } from '../../../../../core/models/report';
import { ChartSeriesResult } from '../../../../../core/models/widget-query';
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
  public static buildY(input: YAxesInput): object[] {
    const { axes, series, indicesByAxis, seriesColors, yLabel, yConfig, yDateCfg } = input;
    const multiAxis = axes.length > 1;
    const seriesOnAxis = (k: number) => (indicesByAxis.get(k) ?? []).map((i) => series[i]);
    const sideOrder: Record<'left' | 'right', number> = { left: 0, right: 0 };

    return axes.map((axis, k) => {
      const isPrimary = k === 0;
      const orderOnSide = sideOrder[axis.side]++;
      const onAxis = indicesByAxis.get(k) ?? [];
      const isDate = isPrimary && input.yPrimaryIsDate;
      const isText = isPrimary ? input.yPrimaryIsText : PointAxes.firstPointIsText(seriesOnAxis(k));
      const catData = isText ? PointAxes.categories(seriesOnAxis(k), 'y') : null;
      const axisColor = multiAxis && onAxis.length === 1 ? seriesColors[onAxis[0]] : null;
      return {
        ...(isDate
          ? ChartScale.dateAxis(yDateCfg)
          : ChartScale.numericAxis(isText, axis.logScale, axis.min, axis.max, isPrimary ? yConfig : undefined)),
        ...(catData ? { data: catData } : {}),
        name: isPrimary ? yLabel : axis.label.trim(),
        nameLocation: 'middle' as const,
        nameGap: 40,
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

  /** Whether a group of series plots text (category) values on its Y axis, from the first point present. */
  private static firstPointIsText(seriesForAxis: ChartSeriesResult[]): boolean {
    for (const s of seriesForAxis) {
      const p = s.points[0];
      if (p) return typeof p.y === 'string';
    }
    return false;
  }
}

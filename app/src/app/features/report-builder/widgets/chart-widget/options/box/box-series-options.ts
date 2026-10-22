import type { BoxplotSeriesOption } from 'echarts/charts';
import { Box } from '../../../../../../core/models/widget-query';
import { BoxChart } from './box-chart';
import { BoxMarks } from './box-marks';
import { BoxSeries } from './box-series';

/** One echarts boxplot series per box series. */
export class BoxSeriesOptions {
  public static all(chart: BoxChart): BoxplotSeriesOption[] {
    const outline = BoxMarks.outlineColor(chart);
    return chart.series.map((s) => BoxSeriesOptions.series(chart, s, outline));
  }

  private static series(
    chart: BoxChart,
    s: BoxSeries,
    outline: (min: number, max: number) => string | null,
  ): BoxplotSeriesOption {
    return {
      name: s.name,
      type: 'boxplot',
      // The legend swatch reads the series style; the items' own colours don't reach it.
      itemStyle: { color: s.color, borderColor: s.color },
      data: s.result.boxes.map((box) => BoxSeriesOptions.item(chart, s, box, outline)),
    };
  }

  /** An all-NaN item draws nothing but keeps grouped series aligned. */
  private static item(
    chart: BoxChart,
    s: BoxSeries,
    box: Box | null,
    outline: (min: number, max: number) => string | null,
  ) {
    if (!box) {
      return { value: [NaN, NaN, NaN, NaN, NaN] };
    }
    const border = outline(box.min, box.max);
    return {
      value: [box.min, box.q1, box.median, box.q3, box.max],
      itemStyle: {
        color: s.color,
        borderColor: border ?? s.color,
        borderWidth: border ? 2.5 : 1.5,
        // Dashed so the warning isn't carried by colour alone.
        ...(border ? { borderType: 'dashed' as const } : {}),
        // Raw points read through a dimmed box.
        opacity: chart.showPoints ? 0.35 : 1,
      },
    };
  }
}

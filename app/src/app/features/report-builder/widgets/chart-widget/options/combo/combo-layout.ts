import { CategoryZoom } from '../axes/category-zoom';
import { BarValues } from '../bar/bar-values';
import { PointChartConstants } from '../point/point-chart-constants';
import { ComboChart } from './combo-chart';

/** A combination chart's grid margins, legend and zoom. */
export class ComboLayout {
  /** Extra value axes on a side widen that side's margin. */
  public static grid(chart: ComboChart) {
    const leftCount = chart.axes.filter((a) => a.side === 'left').length;
    const rightCount = chart.axes.filter((a) => a.side === 'right').length;
    return {
      left: 56 + Math.max(0, leftCount - 1) * PointChartConstants.AXIS_OFFSET,
      right: 20 + rightCount * PointChartConstants.AXIS_OFFSET,
      top: chart.showLegend ? 40 : 20,
      bottom: chart.zoom ? 76 : 56,
      containLabel: true,
      outerBoundsContain: 'all' as const,
    };
  }

  public static legend(chart: ComboChart) {
    if (!chart.showLegend) return {};
    return {
      legend: {
        top: 0,
        data: chart.series.map((s) => BarValues.seriesName(s.result, chart.config.title)),
        type: 'scroll' as const,
      },
    };
  }

  public static dataZoom(chart: ComboChart) {
    return chart.zoom ? { dataZoom: CategoryZoom.dataZoom(false) } : {};
  }
}

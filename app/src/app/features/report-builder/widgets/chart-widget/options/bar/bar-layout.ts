import { CategoryZoom } from '../axes/category-zoom';
import { BarChart } from './bar-chart';
import { BarValues } from './bar-values';

/** A bar chart's grid margins, legend and zoom. */
export class BarLayout {
  public static grid(chart: BarChart) {
    const { zoom, horizontal } = chart;
    return {
      left: 56,
      right: zoom && horizontal ? 40 : 20,
      top: chart.showLegend ? 40 : 20,
      bottom: zoom && !horizontal ? 76 : 56,
      containLabel: true,
      outerBoundsContain: 'all' as const,
    };
  }

  public static legend(chart: BarChart) {
    if (!chart.showLegend) return {};
    return {
      legend: {
        top: 0,
        data: chart.series.map((s) => BarValues.seriesName(s, chart.config.title)),
        type: 'scroll' as const,
      },
    };
  }

  public static dataZoom(chart: BarChart) {
    return chart.zoom ? { dataZoom: CategoryZoom.dataZoom(chart.horizontal) } : {};
  }
}

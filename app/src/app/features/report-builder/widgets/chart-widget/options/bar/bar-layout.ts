import { CategoryZoom } from '../axes/category-zoom';
import { ChartLegend } from '../layout/chart-legend';
import { GroupingGrid } from '../layout/grouping-grid';
import { BarChart } from './bar-chart';
import { BarValues } from './bar-values';

/** A bar chart's grid margins, legend and zoom. */
export class BarLayout {
  public static grid(chart: BarChart) {
    return GroupingGrid.build(chart.zoom, chart.horizontal, chart.showLegend);
  }

  public static legend(chart: BarChart) {
    const names = chart.series.map((s) => BarValues.seriesName(s, chart.config.title));
    return ChartLegend.of(chart.showLegend, names);
  }

  public static dataZoom(chart: BarChart) {
    return chart.zoom ? { dataZoom: CategoryZoom.dataZoom(chart.horizontal) } : {};
  }
}

import { CategoryZoom } from '../axes/category-zoom';
import { ChartLegend } from '../layout/chart-legend';
import { SideAxes } from '../axes/side-axes';
import { ComboChart } from './combo-chart';
import { BarSeriesName } from '../bar/values/bar-series-name';

/** A combination chart's grid margins, legend and zoom. */
export class ComboLayout {
  /** Extra value axes on a side widen that side's margin. */
  public static grid(chart: ComboChart) {
    return {
      ...SideAxes.margins(chart.axes),
      top: chart.showLegend ? 40 : 20,
      bottom: chart.zoom ? 76 : 56,
      containLabel: true,
      outerBoundsContain: 'all' as const,
    };
  }

  public static legend(chart: ComboChart) {
    const names = chart.series.map((s) => BarSeriesName.of(s.result, chart.config.title));
    return ChartLegend.of(chart.showLegend, names);
  }

  public static dataZoom(chart: ComboChart) {
    return chart.zoom ? { dataZoom: CategoryZoom.dataZoom(false) } : {};
  }
}

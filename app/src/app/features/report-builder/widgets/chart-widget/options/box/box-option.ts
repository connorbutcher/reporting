import { DatasetColumn } from '../../../../../../core/models/dataset';
import { BoxPlotWidgetConfig } from '../../../../../../core/models/report';
import { BoxPlotQueryResult } from '../../../../../../core/models/widget-query';
import { CategoryZoom } from '../axes/category-zoom';
import { ChartLegend } from '../layout/chart-legend';
import { GroupingGrid } from '../layout/grouping-grid';
import { ECOption } from '../types/ec-option';
import { BoxAxes } from './box-axes';
import { BoxChartResolver } from './box-chart-resolver';
import { BoxMarks } from './box-marks';
import { BoxOverlays } from './box-overlays';
import { BoxSeriesOptions } from './box-series-options';
import { BoxTooltip } from './box-tooltip';

/** Box-and-whisker chart: one box per category, per series. */
export class BoxOption {
  /** Null until there's a dataset and both a category and a value column bound. */
  public static build(
    config: BoxPlotWidgetConfig,
    data: BoxPlotQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    const chart = BoxChartResolver.resolve(config, data, columns, colors);
    if (!chart) {
      return null;
    }

    const { horizontal, zoom } = chart;
    const categoryAxis = BoxAxes.category(chart);
    const valueAxis = BoxAxes.value(chart);
    const reference = BoxMarks.reference(chart);
    return {
      grid: GroupingGrid.build(zoom, horizontal, chart.showLegend),
      ...(zoom ? { dataZoom: CategoryZoom.dataZoom(horizontal) } : {}),
      tooltip: BoxTooltip.option(chart),
      ...ChartLegend.of(
        chart.showLegend,
        chart.series.map((s) => s.name),
      ),
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      // Boxes first, then the overlays on top.
      series: [
        ...BoxSeriesOptions.all(chart),
        ...BoxOverlays.all(chart),
        ...(reference ? [reference] : []),
      ],
    };
  }
}

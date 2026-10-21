import { CategoryAxis } from '../axes/category-axis';
import { ChartScale } from '../axes/chart-scale';
import { ValueExtent } from '../axes/value-extent';
import { ChartFormat } from '../format/chart-format';
import { BoxChart } from './box-chart';

/** The category and value axes of a box plot, on X or Y depending on orientation. */
export class BoxAxes {
  public static category(chart: BoxChart) {
    const name = chart.config.xAxisLabel.trim() || chart.categoryColumn.name;
    return CategoryAxis.build(chart.categories, chart.config, name, chart.horizontal);
  }

  public static value(chart: BoxChart) {
    const axis = chart.valueAxisConfig;
    const scale = ChartScale.numericAxis(
      false,
      axis.min,
      axis.max,
      axis.interval,
      chart.valueConfig,
      axis.scale,
    );
    const rotate = ChartScale.labelRotate(axis.rotate);
    const labelLen = ValueExtent.labelLength(BoxAxes.extentValues(chart), (v) =>
      ChartFormat.numeric(v, chart.valueConfig),
    );
    return {
      ...scale,
      ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
      name: axis.label.trim() || chart.valueColumn.name,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(labelLen, rotate, chart.horizontal ? 'x' : 'y'),
      splitLine: { show: chart.config.showGridLines ?? true },
    };
  }

  /** Every box's whisker ends and every outlier. */
  private static extentValues(chart: BoxChart): number[] {
    return chart.series.flatMap(({ result }) => [
      ...result.boxes.flatMap((box) => (box ? [box.min, box.max] : [])),
      ...result.outliers.map((o) => o.value),
    ]);
  }
}

import { CategoryAxis } from '../axes/category-axis';
import { ChartScale } from '../axes/chart-scale';
import { ValueExtent } from '../axes/value-extent';
import { ChartFormat } from '../format/chart-format';
import { BarChart } from './bar-chart';
import { BarMeasureLabel } from './values/bar-measure-label';

/** The category and value axes of a bar chart, on X or Y depending on orientation. */
export class BarAxes {
  public static category(chart: BarChart) {
    const name = chart.config.xAxisLabel.trim() || chart.categoryColumn.name;
    return CategoryAxis.build(chart.categories, chart.config, name, chart.horizontal);
  }

  public static value(chart: BarChart) {
    const scale = BarAxes.valueScale(chart);
    const rotate = ChartScale.labelRotate(chart.valueAxisConfig.rotate);
    const labelLen = chart.percent
      ? 4
      : ValueExtent.labelLength(
          chart.series.flatMap((s) => s.values),
          (v) => ChartFormat.numeric(v, chart.valueConfig),
        );
    return {
      ...scale,
      ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
      name: BarAxes.valueName(chart),
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(labelLen, rotate, chart.horizontal ? 'x' : 'y'),
      splitLine: { show: chart.config.showGridLines ?? true },
    };
  }

  private static valueScale(chart: BarChart) {
    if (chart.percent) {
      return {
        type: 'value' as const,
        max: 100,
        axisLabel: { formatter: (v: number | string) => `${v}%` },
      };
    }
    const axis = chart.valueAxisConfig;
    return ChartScale.numericAxis(false, null, null, axis.interval, chart.valueConfig, axis.scale);
  }

  private static valueName(chart: BarChart): string {
    const label = chart.valueAxisConfig.label.trim();
    if (label) return label;
    if (chart.percent) return '% of total';
    return BarMeasureLabel.of(chart.config.aggregate, chart.valueColumn?.name ?? null);
  }
}

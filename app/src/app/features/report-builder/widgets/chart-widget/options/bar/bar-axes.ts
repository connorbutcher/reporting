import { NumericColumnConfig } from '../../../../../../core/models/dataset';
import { ChartScale } from '../axes/chart-scale';
import { ChartFormat } from '../format/chart-format';
import { BarChart } from './bar-chart';
import { BarValues } from './bar-values';

/** The category and value axes of a bar chart, on X or Y depending on orientation. */
export class BarAxes {
  public static category(chart: BarChart) {
    const { config, categories, horizontal } = chart;
    // Tilt long vertical category lists unless the user picked an orientation.
    const autoRotate = !horizontal && categories.length > 6 ? 30 : 0;
    const rotate = ChartScale.labelRotate(config.xAxisRotate, autoRotate);
    const scale = ChartScale.categoryAxis(categories, config.xAxisInterval);
    return {
      ...scale,
      name: config.xAxisLabel.trim() || chart.categoryColumn.name,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(
        ChartScale.longestLen(categories),
        rotate,
        horizontal ? 'y' : 'x',
      ),
      axisLabel: { ...scale.axisLabel, rotate },
      // echarts draws the first category at the bottom; read top-down instead.
      ...(horizontal ? { inverse: true } : {}),
    };
  }

  public static value(chart: BarChart) {
    const scale = BarAxes.valueScale(chart);
    const rotate = ChartScale.labelRotate(chart.valueAxisConfig.rotate);
    const labelLen = chart.percent ? 4 : BarAxes.valueLabelLen(chart.series, chart.valueConfig);
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
    return BarValues.measureLabel(chart.config.aggregate, chart.valueColumn?.name ?? null);
  }

  /** The longest formatted value label, to size the value axis name gap. */
  private static valueLabelLen(
    series: readonly { values: readonly (number | null)[] }[],
    config: NumericColumnConfig | undefined,
  ): number {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (const v of s.values) {
        if (typeof v === 'number') {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (!Number.isFinite(min)) return 0;
    return Math.max(
      ChartFormat.numeric(min, config).length,
      ChartFormat.numeric(max, config).length,
    );
  }
}

import { ChartWidgetConfigBase } from '../../../../../../core/models/report';
import { ChartScale } from './chart-scale';

/** The category axis of a grouping chart (bar, combo, box plot, histogram). */
export class CategoryAxis {
  public static build(
    labels: string[],
    config: ChartWidgetConfigBase,
    name: string,
    horizontal: boolean,
  ) {
    const rotate = ChartScale.labelRotate(
      config.xAxisRotate,
      ChartScale.autoCategoryRotate(labels, horizontal),
    );
    const scale = ChartScale.categoryAxis(labels, config.xAxisInterval);
    return {
      ...scale,
      name,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(ChartScale.longestLen(labels), rotate, horizontal ? 'y' : 'x'),
      axisLabel: { ...scale.axisLabel, rotate },
      // echarts draws the first category at the bottom; read top-down instead.
      ...(horizontal ? { inverse: true } : {}),
    };
  }
}

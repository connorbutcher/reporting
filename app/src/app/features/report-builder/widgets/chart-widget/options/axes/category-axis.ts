import { ChartWidgetConfigBase } from '../../../../../../core/models/report';
import { ChartScale } from './chart-scale';

/** The category axis of a grouping chart (bar, combo, box plot, histogram). */
export class CategoryAxis {
  /** Long vertical lists tilt unless the user picked an orientation. */
  private static readonly AUTO_ROTATE_AFTER = 6;

  public static build(
    labels: string[],
    config: ChartWidgetConfigBase,
    name: string,
    horizontal: boolean,
  ) {
    const autoRotate = !horizontal && labels.length > CategoryAxis.AUTO_ROTATE_AFTER ? 30 : 0;
    const rotate = ChartScale.labelRotate(config.xAxisRotate, autoRotate);
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

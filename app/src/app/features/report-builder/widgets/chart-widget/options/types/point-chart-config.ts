import {
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
} from '../../../../../../core/models/report';

/** The two chart kinds that plot raw rows as points, as opposed to aggregated bars. */
export type PointChartConfig = ScatterChartWidgetConfig | LineChartWidgetConfig;

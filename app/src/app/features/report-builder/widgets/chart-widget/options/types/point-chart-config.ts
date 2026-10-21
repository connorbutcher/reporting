import {
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
} from '../../../../../../core/models/report/index';

/** The two chart kinds that plot raw rows as points, as opposed to aggregated bars. */
export type PointChartConfig = ScatterChartWidgetConfig | LineChartWidgetConfig;

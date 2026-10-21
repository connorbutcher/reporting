import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  ChartQueryResult,
  HistogramQueryResult,
  XBarRChartQueryResult,
} from '../../../../../core/models/widget-query';

export type AnyChartResult =
  | ChartQueryResult
  | BarChartQueryResult
  | BoxPlotQueryResult
  | HistogramQueryResult
  | XBarRChartQueryResult;

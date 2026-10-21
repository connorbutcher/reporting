import { DatasetColumn, NumericColumnConfig } from '../../../../../../core/models/dataset';
import { BarChartWidgetConfig, ChartValueAxis } from '../../../../../../core/models/report';
import { BarChartQueryResult, BarSeriesResult } from '../../../../../../core/models/widget-query';

/** A bar chart's config and data, resolved once and shared by each part of its option. */
export interface BarChart {
  readonly config: BarChartWidgetConfig;
  readonly data: BarChartQueryResult | null;
  readonly categoryColumn: DatasetColumn;
  readonly categories: string[];
  readonly series: readonly BarSeriesResult[];
  readonly seriesColors: Map<BarSeriesResult, string>;
  /** The shared measure, when every series plots the same one. */
  readonly valueColumn: DatasetColumn | null;
  readonly valueConfig: NumericColumnConfig | undefined;
  readonly seriesConfigs: Map<BarSeriesResult, NumericColumnConfig | undefined>;
  readonly valueAxisConfig: ChartValueAxis;
  readonly horizontal: boolean;
  readonly percent: boolean;
  readonly stacked: boolean;
  readonly showLegend: boolean;
  readonly zoom: boolean;
  /** Each stack's per-category total, when stacked. */
  readonly stackTotals: Map<string, number[]>;
}

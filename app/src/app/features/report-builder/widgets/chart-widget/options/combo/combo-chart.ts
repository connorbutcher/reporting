import { DatasetColumn, NumericColumnConfig } from '../../../../../../core/models/dataset';
import { ChartValueAxis, ComboChartWidgetConfig } from '../../../../../../core/models/report';
import { BarChartQueryResult, BarSeriesResult } from '../../../../../../core/models/widget-query';
import { ComboSeries } from './combo-series';

/** A combination chart's config and data, resolved once and shared by each part of its option. */
export type ComboChart = {
  readonly config: ComboChartWidgetConfig;
  readonly data: BarChartQueryResult | null;
  readonly categoryColumn: DatasetColumn;
  readonly categories: string[];
  readonly series: readonly ComboSeries[];
  readonly axes: readonly ChartValueAxis[];
  readonly multiAxis: boolean;
  /** The primary axis's shared measure, when its series all plot the same one. */
  readonly valueColumn: DatasetColumn | null;
  readonly valueConfig: NumericColumnConfig | undefined;
  readonly seriesConfigs: Map<BarSeriesResult, NumericColumnConfig | undefined>;
  readonly showLegend: boolean;
  readonly zoom: boolean;
};

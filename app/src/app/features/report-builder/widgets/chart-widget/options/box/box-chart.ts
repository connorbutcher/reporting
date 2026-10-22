import { DatasetColumn, NumericColumnConfig } from '../../../../../../core/models/dataset';
import { BoxPlotWidgetConfig, ChartValueAxis } from '../../../../../../core/models/report';
import { BoxPlotQueryResult } from '../../../../../../core/models/widget-query';
import { BoxSeries } from './box-series';

/** A box plot's config and data, resolved once and shared by each part of its option. */
export type BoxChart = {
  readonly config: BoxPlotWidgetConfig;
  readonly data: BoxPlotQueryResult | null;
  readonly categoryColumn: DatasetColumn;
  readonly valueColumn: DatasetColumn;
  readonly valueConfig: NumericColumnConfig | undefined;
  readonly categories: string[];
  readonly series: readonly BoxSeries[];
  readonly valueAxisConfig: ChartValueAxis;
  readonly horizontal: boolean;
  readonly showPoints: boolean;
  readonly showLegend: boolean;
  readonly zoom: boolean;
};

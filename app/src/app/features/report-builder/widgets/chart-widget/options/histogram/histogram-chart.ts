import { DatasetColumn } from '../../../../../../core/models/dataset';
import { ChartValueAxis, HistogramWidgetConfig } from '../../../../../../core/models/report';
import { HistogramBin, HistogramQueryResult } from '../../../../../../core/models/widget-query';
import { HistogramSeries } from './histogram-series';

/** A histogram's config and data, resolved once and shared by each part of its option. */
export type HistogramChart = {
  readonly config: HistogramWidgetConfig;
  readonly data: HistogramQueryResult | null;
  /** The binned column. */
  readonly valueColumn: DatasetColumn;
  readonly bins: HistogramBin[];
  readonly binLabels: string[];
  readonly series: readonly HistogramSeries[];
  readonly countAxisConfig: ChartValueAxis;
  readonly horizontal: boolean;
  readonly showLegend: boolean;
};

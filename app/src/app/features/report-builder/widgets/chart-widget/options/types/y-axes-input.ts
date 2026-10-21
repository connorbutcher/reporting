import { DateColumnConfig, NumericColumnConfig } from '../../../../../../core/models/dataset/index';
import { ChartValueAxis } from '../../../../../../core/models/report/index';
import { ChartSeriesResult } from '../../../../../../core/models/widget-query/index';
import { PointAxes } from '../point-axes';

/** Everything {@link PointAxes.buildY} needs about the plotted data and the primary column. */
export interface YAxesInput {
  axes: readonly ChartValueAxis[];
  series: ChartSeriesResult[];
  /** Series indices grouped by the Y axis they plot on. */
  indicesByAxis: Map<number, number[]>;
  seriesColors: string[];
  /** The primary axis's resolved label; secondary axes use their own. */
  yLabel: string;
  yConfig: NumericColumnConfig | undefined;
  yDateCfg: DateColumnConfig | undefined;
  yPrimaryIsText: boolean;
  yPrimaryIsDate: boolean;
  /** Whether the primary axis draws horizontal gridlines (its `splitLine`). */
  showGridLines: boolean;
}

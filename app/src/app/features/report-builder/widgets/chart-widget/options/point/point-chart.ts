import {
  DateColumnConfig,
  DatasetColumn,
  NumericColumnConfig,
} from '../../../../../../core/models/dataset';
import { ChartValueAxis } from '../../../../../../core/models/report';
import { ChartQueryResult, ChartSeriesResult } from '../../../../../../core/models/widget-query';
import { NumericExtent } from '../axes/types/numeric-extent';
import { ChartCommentAnchor } from './types/chart-comment-anchor';
import { Coord } from './types/coord';
import { PointChartConfig } from './types/point-chart-config';
import { SeriesStyle } from './types/series-style';
import { SizeScale } from './types/size-scale';

/** A scatter or line chart's config and data, resolved once and shared by each part of its option. */
export type PointChart = {
  readonly config: PointChartConfig;
  readonly data: ChartQueryResult | null;
  readonly series: ChartSeriesResult[];
  readonly axes: ChartValueAxis[];
  readonly multiAxis: boolean;
  readonly xColumn: DatasetColumn;
  readonly xLabel: string;
  /** The primary Y axis's label; secondary axes carry their own. */
  readonly yLabel: string;
  readonly xIsText: boolean;
  readonly xIsDate: boolean;
  /** Only the primary Y column's type is known, so date Y axes are primary-only. */
  readonly yPrimaryIsText: boolean;
  readonly yPrimaryIsDate: boolean;
  readonly xConfig: NumericColumnConfig | undefined;
  readonly yConfig: NumericColumnConfig | undefined;
  readonly xDateConfig: DateColumnConfig | undefined;
  readonly yDateConfig: DateColumnConfig | undefined;
  readonly formatX: (value: Coord) => string;
  readonly formatYPrimary: (value: Coord) => string;
  /** A series on a secondary axis has no column in the shared schema, so it uses plain grouping. */
  readonly formatYOther: (value: Coord) => string;
  /** A text X axis's categories, else null. */
  readonly xCategories: string[] | null;
  /** The Y axis index each series plots on. */
  readonly seriesAxisIndex: number[];
  readonly seriesStyles: SeriesStyle[];
  readonly seriesColors: string[];
  readonly yExtent: NumericExtent | null;
  /** Colour-by-value needs a numeric Y and data; it replaces the legend. */
  readonly colorByValue: boolean;
  /** One bubble scale shared across series, or null when nothing is sized. */
  readonly sizeScale: SizeScale | null;
  readonly showSeries: boolean;
  readonly showLegend: boolean;
  readonly zoom: boolean;
  readonly commentAnchors: readonly ChartCommentAnchor[];
  readonly highlightedAnchor: ChartCommentAnchor | null;
};

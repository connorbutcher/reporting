import { ChartSeriesRenderAs } from './chart-series-render-as.model';
import { ChartSymbol } from './chart-symbol.model';
import { LineDashStyle } from './line-dash-style.model';
import { FilterGroup } from '../../filter';
import { ChartSort } from './chart-sort.model';

/** One dataset's series on a chart, queried on its own dataset and merged client-side. */
export type ChartSeriesBinding = {
  /** Client-generated; not meaningful server-side. */
  id: string;
  datasetId: number | null;
  xColumnId: string | null;
  yColumnId: string | null;
  /** Bubble size column. Scatter only. */
  sizeColumnId?: string | null;
  /**
   * Bar measures, one series each; {@link yColumnId} mirrors the first. Read through
   * {@link ChartConfigs.barValueColumnIds}.
   */
  valueColumnIds?: string[] | null;
  /** One series per distinct value; null plots one. */
  seriesColumnId: string | null;
  /** Combo chart only: bars or line; null means bars. */
  renderAs?: ChartSeriesRenderAs | null;
  /** Point charts only: the {@link ChartValueAxis.id} to plot against; unknown or null uses the primary. */
  yAxisId: string | null;
  label: string;
  /** Null uses the palette. Ignored when splitting by colour. */
  color?: string | null;
  symbol?: ChartSymbol | null;
  dashStyle?: LineDashStyle | null;
  filter: FilterGroup | null;
  /**
   * Point charts only: draw order for this binding's rows; null is X ascending. Grouping charts use
   * the chart-level `sort`.
   */
  sort?: ChartSort | null;
};

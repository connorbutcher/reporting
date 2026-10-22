import { ChartSeriesRenderAs } from './chart-series-render-as.model';
import { ChartSymbol } from './chart-symbol.model';
import { LineDashStyle } from './line-dash-style.model';
import { FilterGroup } from '../../filter';
import { ChartSort } from './chart-sort.model';

/**
 * One dataset's contribution to a chart: its axes, optional per-value split, and
 * row filter. A chart carries one or more of these; several overlaid on shared
 * axes is how two datasets are plotted against each other. Each binding is
 * queried on its own dataset and its series merged client-side.
 */
export type ChartSeriesBinding = {
  /** Client-generated, addresses this binding in the editor — not meaningful server-side. */
  id: string;
  /** Null until the user binds this series to a dataset. */
  datasetId: number | null;
  xColumnId: string | null;
  yColumnId: string | null;
  /**
   * Scales each point's marker by this numeric column's value — a bubble chart. Scatter only;
   * ignored by every other chart kind (including line, where a varying marker size over a
   * connected line reads poorly).
   */
  sizeColumnId?: string | null;
  /**
   * A bar chart's measures, each plotted as its own series (grouped or stacked). Null/empty on
   * point and box charts, which use the single {@link yColumnId}. When a bar binding has these,
   * {@link yColumnId} mirrors the first so code reading a single measure still resolves one.
   * Read through {@link barValueColumnIds}, which folds a legacy single-measure binding.
   */
  valueColumnIds?: string[] | null;
  /** Splits this binding into a separate coloured series per distinct value. Null plots one. */
  seriesColumnId: string | null;
  /**
   * On a combination chart, whether this series is drawn as bars or as a line over the categories;
   * null/absent means bars. Ignored by every other chart kind, which draws all series the one way.
   */
  renderAs?: ChartSeriesRenderAs | null;
  /**
   * Which value axis this binding plots against, by {@link ChartValueAxis.id}.
   * Null — or an id no longer among the chart's axes — falls back to the primary
   * (first) axis. Only meaningful for point charts.
   */
  yAxisId: string | null;
  /** Blank falls back to the dataset/column name in the legend. */
  label: string;
  /** Overrides the auto-assigned palette colour; null uses the palette. Ignored when the binding splits by colour. */
  color?: string | null;
  /** Point marker shape; null uses the chart kind's default. */
  symbol?: ChartSymbol | null;
  /** Line dash for a line series; null draws solid. */
  dashStyle?: LineDashStyle | null;
  /** Rows this binding plots, narrowed server-side. Null means no per-series filter. */
  filter: FilterGroup | null;
  /**
   * Draw order for a point chart's (scatter/line) own rows — each binding's points are queried
   * and ordered independently, since overlaid bindings don't share a merged axis the way bar's
   * categories do. Null keeps the default X-ascending order. Ignored by every grouping chart
   * (bar, combo, box plot, histogram), which order via their own chart-level `sort` instead.
   */
  sort?: ChartSort | null;
};

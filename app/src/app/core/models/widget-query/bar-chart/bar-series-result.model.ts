import { FilterGroup } from '../../filter';

export type BarSeriesResult = {
  /** The split key from the server, rewritten by {@link ChartQuery} to the legend label. */
  label: string;
  /** Which measure this series reduces, when several value columns are plotted; null/absent for 'count'. */
  valueColumnId?: string | null;
  /** The measure column's display name, for composing a multi-measure legend label; empty for 'count'. */
  valueColumnLabel?: string;
  /** The binding this series came from, set during the client merge — drives its stack group and colour override. */
  bindingId?: string;
  /** One entry per category in {@link BarChartQueryResult.categories} order; null where this series has no rows in that category. */
  values: (number | null)[];
  /** Rows behind each bar, aligned with `values`. */
  rowCounts?: (number | null)[];
  /** Each bar's formatted tooltip column lines, aligned with `values`. */
  tooltipLines?: string[][];
  /** Client-side, after merging: each category's drill-through conditions against this series' own dataset. */
  categoryDrills?: (FilterGroup | null)[];
  /** Conditions selecting this series' rows (its split value), for drill-through; null with no split. */
  drill?: FilterGroup | null;
};

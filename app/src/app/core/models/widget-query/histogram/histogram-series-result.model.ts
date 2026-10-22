import { FilterGroup } from '../../filter';

export type HistogramSeriesResult = {
  /** The split key from the server, rewritten by {@link ChartQuery} to the legend label. */
  label: string;
  /** Which column this series distributes, when several value columns are plotted. */
  valueColumnId?: string | null;
  /** The measure column's display name, for composing a multi-measure legend label. */
  valueColumnLabel?: string;
  /** Client-side, after merging: the binding this series came from. */
  bindingId?: string;
  /** One value per bin in {@link HistogramQueryResult.bins} order — a count, frequency, or density. */
  values: number[];
  /** The series' own mean, σ and in-range count, for a fitted normal curve. */
  mean?: number;
  stdDev?: number;
  count?: number;
  /** Conditions selecting this series' rows (its split value), for drill-through; null with no split. */
  drill?: FilterGroup | null;
  /** Each bin's tooltip column lines, aligned with `values`. */
  tooltipLines?: string[][];
};

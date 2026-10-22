/** Counts for the "N of M rows" footer, before per-chart narrowing. */
export type ChartRowCounts = {
  /** Every row in the dataset, ignoring the filter. */
  totalRowCount: number;
  /** The rows the filter matches; equals {@link totalRowCount} when there is no filter. */
  matchedRowCount: number;
  /** True when the server drew on only part of the matching rows (a point chart's point cap, a box plot's or histogram's scan cap). */
  truncated?: boolean;
  /** How many rows a capped scan (box plot, histogram) actually read; only meaningful with {@link truncated}. */
  scannedRowCount?: number;
};

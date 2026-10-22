/** One bin of a histogram: its half-open value range and a ready-made axis label. */
export type HistogramBin = {
  /** The bin's inclusive lower edge. */
  lower: number;
  /** The bin's exclusive upper edge (inclusive for the final bin). */
  upper: number;
  /** A display label for the bin's range, e.g. "10 – 20". */
  label: string;
};

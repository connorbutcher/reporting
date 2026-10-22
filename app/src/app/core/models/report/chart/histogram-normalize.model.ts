/**
 * What a histogram bar's height represents: the raw `count` of values in the bin, its `frequency`
 * (share of all values), or its `density` (frequency divided by bin width, so the bars integrate to 1).
 */
export type HistogramNormalize = 'count' | 'frequency' | 'density';

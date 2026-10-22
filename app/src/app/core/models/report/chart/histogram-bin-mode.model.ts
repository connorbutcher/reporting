/**
 * How a histogram chooses its bin edges. `count` divides the range into a fixed number of equal
 * bins; `width` tiles bins of a fixed width across it; `auto` picks the count from the data
 * (Freedman–Diaconis, falling back to Sturges).
 */
export type HistogramBinMode = 'count' | 'width' | 'auto';

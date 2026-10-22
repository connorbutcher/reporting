/**
 * `tukey` and `stdDev` end whiskers at {@link BoxPlotWidgetConfig.whiskerFactor} IQRs or standard
 * deviations and draw outliers beyond; `minMax` reaches the extremes.
 */
export type BoxWhisker = 'tukey' | 'minMax' | 'stdDev';

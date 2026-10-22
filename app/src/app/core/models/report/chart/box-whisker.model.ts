/**
 * Where a box plot's whiskers end. `tukey` stops them a multiple (see {@link BoxPlotWidgetConfig.whiskerFactor})
 * of the IQR past the quartiles; `stdDev` stops them that multiple of the standard deviation either side of
 * the mean; both draw anything beyond as outliers. `minMax` reaches the group's actual extremes with no outliers.
 */
export type BoxWhisker = 'tukey' | 'minMax' | 'stdDev';

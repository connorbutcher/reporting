import { ChartWidgetConfigBase } from './chart-widget-config-base.model';
import { HistogramBinMode } from './histogram-bin-mode.model';
import { HistogramNormalize } from './histogram-normalize.model';

/**
 * A histogram. Unlike the other charts it plots the distribution of a single numeric column
 * (`xColumnId`): its values are binned into equal ranges and each bin's frequency drawn as a bar.
 * A series column, if set, overlays a separate distribution per distinct value.
 */
export type HistogramWidgetConfig = ChartWidgetConfigBase & {
  type: 'histogram';

  /** How the bin edges are chosen. */
  binMode: HistogramBinMode;
  /** The number of bins for `count` mode; ignored otherwise. */
  binCount: number;
  /** The width of each bin for `width` mode; ignored otherwise. */
  binWidth: number;
  /** Fixed lower bound of the binned range; null/undefined uses the data's minimum. */
  rangeMin?: number | null;
  /** Fixed upper bound of the binned range; null/undefined uses the data's maximum. */
  rangeMax?: number | null;
  /** Whether each bar shows a raw count, a relative frequency, or a density. */
  normalize: HistogramNormalize;
  /** Accumulates each bin into the ones before it, drawing a cumulative distribution. */
  cumulative: boolean;
  /** Draws bars horizontally (bins down the Y axis) rather than as vertical columns. */
  horizontal: boolean;
  /** Overlays a fitted normal curve per series (ignored when cumulative). */
  showNormalCurve?: boolean;
};

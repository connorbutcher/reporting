import { NumericColumnConfig } from '../../../../../../core/models/dataset';
import { ChartGuideLine } from '../../../../../../core/models/report';
import { HistogramBin, ResolvedToleranceBand } from '../../../../../../core/models/widget-query';
import { ChartFormat } from '../format/chart-format';

/**
 * The bin category axis. Values on the binned variable map to fractional category positions:
 * v sits at (v − firstLower) / binWidth − 0.5, so marks land where v falls across the bars.
 */
export class HistogramBinAxis {
  /** Bin labels formatted like the column, falling back to the server's when both edges match. */
  public static labels(bins: HistogramBin[], config: NumericColumnConfig | undefined): string[] {
    return bins.map((bin) => {
      const lower = ChartFormat.numeric(bin.lower, config);
      const upper = ChartFormat.numeric(bin.upper, config);
      return lower === upper ? bin.label : `${lower} – ${upper}`;
    });
  }

  /** X-axis bands re-expressed as bin positions. Others, or all when bins are degenerate, drop. */
  public static bands(
    bands: readonly ResolvedToleranceBand[],
    bins: HistogramBin[],
  ): ResolvedToleranceBand[] {
    const geometry = HistogramBinAxis.geometry(bins);
    if (!geometry) return [];
    const [firstLower, binWidth] = geometry;
    return bands
      .filter((band) => band.axis === 'x')
      .map((band) => ({
        ...band,
        min: HistogramBinAxis.toBinIndex(band.min, firstLower, binWidth),
        max: HistogramBinAxis.toBinIndex(band.max, firstLower, binWidth),
        concessionLower: HistogramBinAxis.toBinIndex(band.concessionLower, firstLower, binWidth),
        concessionUpper: HistogramBinAxis.toBinIndex(band.concessionUpper, firstLower, binWidth),
      }));
  }

  /** {@link bands} for guide lines. */
  public static guideLines(
    lines: readonly ChartGuideLine[],
    bins: HistogramBin[],
  ): ChartGuideLine[] {
    const geometry = HistogramBinAxis.geometry(bins);
    if (!geometry) return [];
    const [firstLower, binWidth] = geometry;
    return lines
      .filter((line) => line.axis === 'x')
      .map((line) => ({
        ...line,
        value: HistogramBinAxis.toBinIndex(line.value, firstLower, binWidth),
        valueTo:
          line.valueTo === null || line.valueTo === undefined
            ? line.valueTo
            : HistogramBinAxis.toBinIndex(line.valueTo, firstLower, binWidth),
      }));
  }

  /** The first bin's lower edge and the bin width, or null when there's no width to map onto. */
  private static geometry(bins: HistogramBin[]): [firstLower: number, binWidth: number] | null {
    if (bins.length === 0) return null;
    const binWidth = bins[0].upper - bins[0].lower;
    return binWidth > 0 ? [bins[0].lower, binWidth] : null;
  }

  private static toBinIndex(value: number, firstLower: number, binWidth: number): number;
  private static toBinIndex(
    value: number | null,
    firstLower: number,
    binWidth: number,
  ): number | null;
  private static toBinIndex(
    value: number | null,
    firstLower: number,
    binWidth: number,
  ): number | null {
    return value === null ? null : (value - firstLower) / binWidth - 0.5;
  }
}

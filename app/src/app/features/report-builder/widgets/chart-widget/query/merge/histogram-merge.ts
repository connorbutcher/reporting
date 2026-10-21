import { HistogramQueryResult, HistogramSeriesResult } from '../../../../../../core/models/widget-query';
import { HistogramPart } from '../histogram-part';
import { RowCounts } from './row-counts';
import { SeriesLabels } from './series-labels';

export class HistogramMerge {
  /**
   * Flattens each binding's distribution into one result. The caller has already aligned their
   * bins, so the first binding with data supplies the axis. Labels compose like the bar overlay's.
   */
  public static merge(parts: HistogramPart[]): HistogramQueryResult {
    const first = parts[0].result;
    const basis = parts.find((p) => p.result.bins.length > 0) ?? parts[0];
    const series = parts.flatMap((part) => HistogramMerge.series(part, parts.length > 1));
    SeriesLabels.numberRepeatedSeries(series);

    return {
      id: first.id,
      name: first.name,
      bins: basis.result.bins,
      series,
      // Every binding resolves the same spec, so the first non-empty bounds stand for all.
      toleranceBands: basis.result.toleranceBands,
      ...RowCounts.sum(parts),
      truncated: parts.some((p) => p.result.truncated),
      scannedRowCount: parts.reduce((sum, p) => sum + (p.result.scannedRowCount ?? 0), 0),
    };
  }

  private static series(
    { binding, result }: HistogramPart,
    multiBinding: boolean,
  ): HistogramSeriesResult[] {
    const base = binding.label.trim() || result.name;
    const vary = {
      binding: multiBinding,
      measure: new Set(result.series.map((s) => s.valueColumnId ?? '')).size > 1,
      split: result.series.some((s) => s.label !== ''),
    };
    return result.series.map(
      (s): HistogramSeriesResult => ({
        ...s,
        label: SeriesLabels.compose(base, s.valueColumnLabel, s.label, vary),
        bindingId: binding.id,
      }),
    );
  }
}

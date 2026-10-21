import { ChartSeriesBinding } from '../../../../../../core/models/report';
import { ChartRowCounts } from '../../../../../../core/models/widget-query';

export class RowCounts {
  /**
   * Row counts for the footer, counting each dataset once. Bindings sharing a dataset contribute the
   * widest slice any of them plots.
   */
  public static sum(
    parts: readonly { binding: ChartSeriesBinding; result: ChartRowCounts }[],
  ): ChartRowCounts {
    const byDataset = new Map<number | null, ChartRowCounts>();
    for (const { binding, result } of parts) {
      const seen = byDataset.get(binding.datasetId);
      byDataset.set(binding.datasetId, {
        totalRowCount: result.totalRowCount,
        matchedRowCount: Math.max(seen?.matchedRowCount ?? 0, result.matchedRowCount),
      });
    }

    let totalRowCount = 0;
    let matchedRowCount = 0;
    for (const counts of byDataset.values()) {
      totalRowCount += counts.totalRowCount;
      matchedRowCount += counts.matchedRowCount;
    }
    return { totalRowCount, matchedRowCount };
  }
}

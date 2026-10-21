import { ChartQueryResult, ChartSeriesResult } from '../../../../../../core/models/widget-query';
import { ChartQueryPart } from '../chart-query-part';
import { RowCounts } from './row-counts';
import { SeriesLabels } from './series-labels';

export class PointMerge {
  /**
   * Flattens each binding's series into one result tagged by binding. With several bindings, each
   * series is named for its binding and repeated names are suffixed.
   */
  public static merge(parts: ChartQueryPart[]): ChartQueryResult {
    const first = parts[0].result;
    if (parts.length === 1) {
      const bindingId = parts[0].binding.id;
      return { ...first, series: first.series.map((s) => ({ ...s, bindingId })) };
    }

    const bases = SeriesLabels.numberRepeats(
      parts.map(({ binding, result }) => binding.label.trim() || result.name),
    );
    return {
      id: first.id,
      name: first.name,
      series: parts.flatMap((part, i) => PointMerge.series(part, bases[i])),
      toleranceBands: first.toleranceBands,
      ...RowCounts.sum(parts),
      totalPoints: parts.reduce((sum, p) => sum + (p.result.totalPoints ?? 0), 0),
      truncated: parts.some((p) => p.result.truncated),
      sampled: parts.some((p) => p.result.sampled),
    };
  }

  private static series({ binding, result }: ChartQueryPart, base: string): ChartSeriesResult[] {
    const split = result.series.length > 1;
    return result.series.map((s) => ({
      points: s.points,
      label: split && s.label ? `${base} · ${s.label}` : base,
      bindingId: binding.id,
    }));
  }
}

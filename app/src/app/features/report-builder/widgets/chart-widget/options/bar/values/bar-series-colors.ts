import { ChartSeriesBinding } from '../../../../../../../core/models/report';
import { BarSeriesResult } from '../../../../../../../core/models/widget-query';
import { SeriesColors } from '../../colors/series-colors';

export class BarSeriesColors {
  /**
   * Each series' colour: its binding's override while that binding yields a single series, else
   * its palette colour.
   */
  public static of(
    series: readonly BarSeriesResult[],
    bindings: readonly ChartSeriesBinding[],
    colors: Map<string, string>,
  ): Map<BarSeriesResult, string> {
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const seriesPerBinding = BarSeriesColors.seriesPerBinding(series);
    return new Map(
      series.map((s, i) => {
        const binding = s.bindingId ? bindingsById.get(s.bindingId) : undefined;
        const count = s.bindingId ? (seriesPerBinding.get(s.bindingId) ?? 1) : series.length;
        const override = count === 1 ? (binding?.color ?? null) : null;
        return [s, override ?? SeriesColors.forSeries(colors, s.label, i)];
      }),
    );
  }

  private static seriesPerBinding(series: readonly BarSeriesResult[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId) {
        counts.set(s.bindingId, (counts.get(s.bindingId) ?? 0) + 1);
      }
    }
    return counts;
  }
}

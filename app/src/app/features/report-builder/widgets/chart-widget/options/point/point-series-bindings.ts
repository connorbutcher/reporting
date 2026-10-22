import {
  ChartSeriesBinding,
  ChartValueAxis,
  ChartConfigs,
} from '../../../../../../core/models/report';
import { ChartSeriesResult } from '../../../../../../core/models/widget-query';
import { SeriesStyle } from './types/series-style';

/** Per-series settings read live from each series' binding, so edits re-render without a refetch. */
export class PointSeriesBindings {
  /** A colour-by split keeps the palette colours. */
  public static styles(
    series: readonly ChartSeriesResult[],
    bindings: readonly ChartSeriesBinding[],
  ): SeriesStyle[] {
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const splitCounts = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId) {
        splitCounts.set(s.bindingId, (splitCounts.get(s.bindingId) ?? 0) + 1);
      }
    }
    return series.map((s) => {
      const binding = s.bindingId ? bindingsById.get(s.bindingId) : undefined;
      const split = (s.bindingId ? (splitCounts.get(s.bindingId) ?? 1) : 1) > 1;
      return {
        color: !split ? (binding?.color ?? null) : null,
        symbol: binding?.symbol ?? null,
        dashStyle: binding?.dashStyle ?? null,
      };
    });
  }

  public static axisIndex(
    series: readonly ChartSeriesResult[],
    bindings: readonly ChartSeriesBinding[],
    axes: ChartValueAxis[],
  ): number[] {
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    return series.map((s) =>
      ChartConfigs.axisIndex(
        axes,
        (s.bindingId ? bindingsById.get(s.bindingId) : undefined)?.yAxisId ?? null,
      ),
    );
  }
}

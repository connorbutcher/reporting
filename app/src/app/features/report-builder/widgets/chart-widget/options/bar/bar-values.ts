import { DatasetColumn, NumericColumnConfig } from '../../../../../../core/models/dataset';
import { Aggregate, ChartSeriesBinding } from '../../../../../../core/models/report';
import { BarSeriesResult } from '../../../../../../core/models/widget-query';
import { SeriesColors } from '../colors/series-colors';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';

/** Naming, stacking and value formatting for bar series, shared with the combo chart. */
export class BarValues {
  /** Name prefix of the hidden series that carry stack-total labels. */
  public static readonly TOTAL_PREFIX = '​total:';

  /** "Count of rows", or the aggregate of the measure ("Sum of Price"). */
  public static measureLabel(aggregate: Aggregate, measure: string | null): string {
    if (aggregate === 'count') return 'Count of rows';
    const name = BarValues.aggregateLabel(aggregate);
    return measure ? `${name} of ${measure}` : name;
  }

  public static seriesNumericConfig(
    s: BarSeriesResult,
    columns: DatasetColumn[],
  ): NumericColumnConfig | undefined {
    return ChartFormat.numericConfig(ChartColumns.byId(columns, s.valueColumnId ?? null));
  }

  /** Each series reads through its own measure's format, else the shared one. A count has none. */
  public static seriesConfigs(
    aggregate: Aggregate,
    series: readonly BarSeriesResult[],
    columns: DatasetColumn[],
    sharedConfig: NumericColumnConfig | undefined,
  ): Map<BarSeriesResult, NumericColumnConfig | undefined> {
    const isCount = aggregate === 'count';
    return new Map(
      series.map((s) => [
        s,
        isCount ? undefined : (BarValues.seriesNumericConfig(s, columns) ?? sharedConfig),
      ]),
    );
  }

  /**
   * Each series' colour: its binding's override while that binding yields a single series, else
   * its palette colour.
   */
  public static seriesColors(
    series: readonly BarSeriesResult[],
    bindings: readonly ChartSeriesBinding[],
    colors: Map<string, string>,
  ): Map<BarSeriesResult, string> {
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const seriesPerBinding = BarValues.seriesPerBinding(series);
    return new Map(
      series.map((s, i) => {
        const binding = s.bindingId ? bindingsById.get(s.bindingId) : undefined;
        const count = s.bindingId ? (seriesPerBinding.get(s.bindingId) ?? 1) : series.length;
        const override = count === 1 ? (binding?.color ?? null) : null;
        return [s, override ?? SeriesColors.forSeries(colors, s.label, i)];
      }),
    );
  }

  public static formatValue(
    value: number,
    percent: boolean,
    config: NumericColumnConfig | undefined,
  ): string {
    return percent
      ? `${ChartFormat.numeric(value, { kind: 'numeric', decimals: 1 })}%`
      : ChartFormat.numeric(value, config);
  }

  public static seriesName(s: BarSeriesResult, chartTitle: string): string {
    return s.label || chartTitle || 'Series';
  }

  /** Each binding's series stack together, so overlaid datasets stand side by side. */
  public static stackOf(s: BarSeriesResult): string {
    return s.bindingId ?? 'total';
  }

  /** Raw values, or each as a share of its stack's category total when 100% stacked. */
  public static plotted(
    s: BarSeriesResult,
    percent: boolean,
    stackTotals: Map<string, number[]>,
  ): (number | null)[] {
    if (!percent) return s.values;
    const totals = stackTotals.get(BarValues.stackOf(s));
    return s.values.map((v, c) => {
      const total = totals?.[c] ?? 0;
      return v === null || total === 0 ? null : (v / total) * 100;
    });
  }

  private static seriesPerBinding(series: readonly BarSeriesResult[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId) counts.set(s.bindingId, (counts.get(s.bindingId) ?? 0) + 1);
    }
    return counts;
  }

  private static aggregateLabel(aggregate: Aggregate): string {
    switch (aggregate) {
      case 'sum':
        return 'Sum';
      case 'average':
        return 'Average';
      case 'count':
        return 'Count';
      case 'min':
        return 'Min';
      case 'max':
        return 'Max';
    }
  }
}

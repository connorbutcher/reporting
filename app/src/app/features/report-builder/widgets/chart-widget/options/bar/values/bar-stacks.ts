import { BarSeriesResult } from '../../../../../../../core/models/widget-query';

/** Each binding's series stack together, so overlaid datasets stand side by side. */
export class BarStacks {
  /** Name prefix of the hidden series that carry stack-total labels. */
  public static readonly TOTAL_PREFIX = '​total:';

  public static of(s: BarSeriesResult): string {
    return s.bindingId ?? 'total';
  }

  /** Each stack's per-category total. */
  public static totals(
    series: readonly BarSeriesResult[],
    categories: string[],
  ): Map<string, number[]> {
    const stackTotals = new Map<string, number[]>();
    for (const s of series) {
      const stack = BarStacks.of(s);
      const totals = stackTotals.get(stack) ?? categories.map(() => 0);
      s.values.forEach((v, c) => (totals[c] += v ?? 0));
      stackTotals.set(stack, totals);
    }
    return stackTotals;
  }

  /** Raw values, or each as a share of its stack's category total when 100% stacked. */
  public static plotted(
    s: BarSeriesResult,
    percent: boolean,
    stackTotals: Map<string, number[]>,
  ): (number | null)[] {
    if (!percent) return s.values;
    const totals = stackTotals.get(BarStacks.of(s));
    return s.values.map((v, c) => {
      const total = totals?.[c] ?? 0;
      return v === null || total === 0 ? null : (v / total) * 100;
    });
  }
}

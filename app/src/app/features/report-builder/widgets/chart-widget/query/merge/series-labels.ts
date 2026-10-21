/** Legend labels for series merged from several bindings. */
export class SeriesLabels {
  /** Joins binding, measure and split from only the parts that vary across the merged series. */
  public static compose(
    base: string,
    measureLabel: string | undefined,
    splitLabel: string | undefined,
    vary: { binding: boolean; measure: boolean; split: boolean },
  ): string {
    const parts: string[] = [];
    if (vary.binding) parts.push(base);
    if (vary.measure) parts.push(measureLabel || 'Value');
    if (vary.split) parts.push(splitLabel || '(blank)');
    return parts.length > 0 ? parts.join(' · ') : base || measureLabel || 'Value';
  }

  /** Suffixes each repeated label with its occurrence, e.g. "Line (1)", "Line (2)". */
  public static numberRepeats(labels: readonly string[]): string[] {
    const counts = new Map<string, number>();
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
    const seen = new Map<string, number>();
    return labels.map((label) => {
      if ((counts.get(label) ?? 0) <= 1) return label;
      const n = (seen.get(label) ?? 0) + 1;
      seen.set(label, n);
      return `${label} (${n})`;
    });
  }

  public static numberRepeatedSeries(series: { label: string }[]): void {
    const labels = SeriesLabels.numberRepeats(series.map((s) => s.label));
    series.forEach((s, i) => (s.label = labels[i]));
  }
}

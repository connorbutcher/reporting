/** The palette plus the stateless label→colour lookup. */
export class SeriesColors {
  /** Cycles if there are more series than colours. */
  public static readonly PALETTE = [
    '#2f6fed',
    '#f97316',
    '#16a34a',
    '#db2777',
    '#7c3aed',
    '#0891b2',
    '#ca8a04',
    '#dc2626',
  ];

  /** A series' colour from the resolved map, falling back to index order. */
  public static forSeries(colors: Map<string, string>, label: string, index: number): string {
    return colors.get(label) ?? SeriesColors.PALETTE[index % SeriesColors.PALETTE.length];
  }
}

/**
 * Assigns each series a palette colour keyed by its label and remembers it across renders,
 * so adding or removing one series never reshuffles the others. Owned by the chart component
 * (one per chart) and re-resolved on every option rebuild.
 */
export class SeriesPalette {
  private readonly assigned = new Map<string, string>();

  /** The colour map for the given series labels, in draw order. */
  public resolve(labels: readonly string[]): Map<string, string> {
    // Drop colours for series no longer plotted, freeing them for reuse.
    const wanted = new Set(labels);
    for (const key of [...this.assigned.keys()]) if (!wanted.has(key)) this.assigned.delete(key);

    for (const label of labels) {
      if (this.assigned.has(label)) continue;
      // First palette colour not already taken; once all are in use, wrap by count.
      const used = new Set(this.assigned.values());
      const free = SeriesColors.PALETTE.find((c) => !used.has(c));
      this.assigned.set(label, free ?? SeriesColors.PALETTE[this.assigned.size % SeriesColors.PALETTE.length]);
    }
    return new Map(this.assigned);
  }
}

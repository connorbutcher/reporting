/** The palette plus the stateless label→colour lookup. */
export class SeriesColors {
  /**
   * Cycles if there are more series than colours. Red stays out: it's the out-of-tolerance and
   * out-of-control colour, so a red series would read as "failing".
   */
  public static readonly PALETTE = [
    '#2f6fed',
    '#f97316',
    '#16a34a',
    '#db2777',
    '#7c3aed',
    '#0891b2',
    '#ca8a04',
    '#65a30d',
  ];

  /** A series' colour from the resolved map, falling back to index order. */
  public static forSeries(colors: Map<string, string>, label: string, index: number): string {
    return colors.get(label) ?? SeriesColors.PALETTE[index % SeriesColors.PALETTE.length];
  }
}

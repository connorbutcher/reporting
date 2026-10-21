export class SeriesColors {
  /** Red is left out: it means out of tolerance or out of control. */
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

  public static forSeries(colors: Map<string, string>, label: string, index: number): string {
    return colors.get(label) ?? SeriesColors.PALETTE[index % SeriesColors.PALETTE.length];
  }
}

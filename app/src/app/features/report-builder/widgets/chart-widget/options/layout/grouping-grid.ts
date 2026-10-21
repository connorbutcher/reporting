/** The plot margins of a single-axis grouping chart (bar, box plot, histogram). */
export class GroupingGrid {
  /** A zoom slider needs room along the category axis; a legend needs room on top. */
  public static build(zoom: boolean, horizontal: boolean, showLegend: boolean) {
    return {
      left: 56,
      right: zoom && horizontal ? 40 : 20,
      top: showLegend ? 40 : 20,
      bottom: zoom && !horizontal ? 76 : 56,
      containLabel: true,
      outerBoundsContain: 'all' as const,
    };
  }
}

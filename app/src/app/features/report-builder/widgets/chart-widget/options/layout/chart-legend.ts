/** The scrolling legend along the top of a chart. */
export class ChartLegend {
  /** A legend only earns its space with more than one series; the caller decides. */
  public static of(show: boolean, names: string[]) {
    return show ? { legend: { top: 0, data: names, type: 'scroll' as const } } : {};
  }
}

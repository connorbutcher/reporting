import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  ChartQueryResult,
  HistogramQueryResult,
  PartialChartLoad,
} from '../../../../core/models/widget-query';

/** What the count bar under a chart shows. */
export interface ChartCountBarContent {
  label: string;
  /** The PrimeIcons class beside the label. */
  icon: string;
  /** The chart is showing less than it should — draws the eye. */
  warning: boolean;
}

type AnyChartResult = ChartQueryResult | BarChartQueryResult | BoxPlotQueryResult | HistogramQueryResult;

/** Words the count bar under a chart: the table's "N of M rows", plus the ways a chart can fall short of it. */
export class ChartCountBar {
  /**
   * The filtered view ("Showing 40 of 52 rows") when a filter narrows the dataset, else the plain
   * row count. It becomes a warning when the chart is showing less than it should: a point chart
   * the server capped, a box plot or histogram whose scan hit its cap, or an overlaid series that
   * failed to load.
   */
  public static build(result: AnyChartResult, isPointChart: boolean): ChartCountBarContent {
    const matched = result.matchedRowCount;
    const total = result.totalRowCount;
    const failed = (result as PartialChartLoad).failedBindingCount ?? 0;

    let label: string;
    let icon = 'pi-list';
    if (result.truncated) {
      // A point chart caps the points it returns; a box plot or histogram caps the rows it scans.
      const points = isPointChart ? (result as ChartQueryResult) : null;
      const shown = points
        ? points.series.reduce((n, s) => n + s.points.length, 0)
        : (result.scannedRowCount ?? 0);
      const of = points ? (points.totalPoints ?? shown) : matched;
      label = `Showing first ${shown.toLocaleString()} of ${of.toLocaleString()} ${points ? 'points' : 'rows'}`;
    } else if (matched !== total) {
      label = `Showing ${matched.toLocaleString()} of ${total.toLocaleString()} rows`;
      icon = 'pi-filter';
    } else {
      label = `${matched.toLocaleString()} row${matched === 1 ? '' : 's'}`;
    }

    if (failed > 0) label += ` · ${failed} series couldn’t load`;
    return { label, icon, warning: !!result.truncated || failed > 0 };
  }
}

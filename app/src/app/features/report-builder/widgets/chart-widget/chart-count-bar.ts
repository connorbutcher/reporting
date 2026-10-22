import {
  ChartQueryResult,
  HistogramQueryResult,
  PartialChartLoad,
} from '../../../../core/models/widget-query';
import { ChartCountBarContent } from './models/chart-count-bar-content';
import { AnyChartResult } from './models/any-chart-result';
import { Plural } from '../../../../shared/text/plural';

export class ChartCountBar {
  /**
   * "Showing 40 of 52 rows" when filtered, else the row count. A warning when the chart shows less
   * than it should: capped points or scans, or an overlaid series that failed.
   */
  public static build(result: AnyChartResult, isPointChart: boolean): ChartCountBarContent {
    const matched = result.matchedRowCount;
    const total = result.totalRowCount;
    const failed = (result as PartialChartLoad).failedBindingCount ?? 0;

    let label: string;
    let icon = 'pi-list';
    if (result.truncated) {
      const points = isPointChart ? (result as ChartQueryResult) : null;
      const shown = points
        ? points.series.reduce((n, s) => n + s.points.length, 0)
        : (result.scannedRowCount ?? 0);
      const of = points ? (points.totalPoints ?? shown) : matched;
      label = points?.sampled
        ? `Showing ${shown.toLocaleString()} of ${of.toLocaleString()} points, sampled evenly`
        : `Showing first ${shown.toLocaleString()} of ${of.toLocaleString()} ${points ? 'points' : 'rows'}`;
    } else if (matched !== total) {
      label = `Showing ${matched.toLocaleString()} of ${total.toLocaleString()} rows`;
      icon = 'pi-filter';
    } else {
      label = `${matched.toLocaleString()} ${Plural.of(matched, 'row')}`;
    }

    const excluded = (result as HistogramQueryResult).excludedCount ?? 0;
    if (excluded > 0) {
      label += ` · ${excluded.toLocaleString()} outside the bin range`;
    }
    if (failed > 0) {
      label += ` · ${failed} series couldn’t load`;
    }
    return { label, icon, warning: !!result.truncated || failed > 0 };
  }
}

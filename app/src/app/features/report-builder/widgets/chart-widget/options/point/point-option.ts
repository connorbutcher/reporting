import { DatasetColumn } from '../../../../../../core/models/dataset';
import { ChartQueryResult } from '../../../../../../core/models/widget-query';
import { ECOption } from '../types/ec-option';
import { PointXAxis } from './axes/point-x-axis';
import { PointYAxis } from './axes/point-y-axis';
import { PointChartResolver } from './point-chart-resolver';
import { PointDataSeries } from './series/point-data-series';
import { PointLayout } from './point-layout';
import { PointMarks } from './point-marks';
import { CommentMarkers } from './series/comment-markers';
import { PointTooltip } from './point-tooltip';
import { ChartCommentAnchor } from './types/chart-comment-anchor';
import { PointChartConfig } from './types/point-chart-config';

/** Scatter/line chart: value axes with one mark per row, grouped into series. */
export class PointOption {
  /** Null until there's a dataset and both axes are bound. */
  public static build(
    config: PointChartConfig,
    data: ChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
    commentAnchors: readonly ChartCommentAnchor[] = [],
    highlightedAnchor: ChartCommentAnchor | null = null,
  ): ECOption | null {
    const chart = PointChartResolver.resolve(
      config,
      data,
      columns,
      colors,
      commentAnchors,
      highlightedAnchor,
    );
    if (!chart) {
      return null;
    }

    const { multiAxis, axes } = chart;
    const yAxes = PointYAxis.all(chart);
    return {
      // Dates are UTC epoch millis, so lay time axes out in UTC to avoid local-midnight ticks.
      useUTC: true,
      grid: PointLayout.grid(chart),
      tooltip: PointTooltip.option(chart),
      ...PointLayout.legend(chart),
      ...PointLayout.visualMap(chart),
      ...PointLayout.dataZoom(chart),
      xAxis: PointXAxis.build(chart),
      yAxis: multiAxis ? yAxes : yAxes[0],
      series: [
        ...PointDataSeries.all(chart),
        ...PointMarks.references(chart),
        ...CommentMarkers.pins(chart.commentAnchors, multiAxis, axes.length),
        ...CommentMarkers.highlight(chart.highlightedAnchor, multiAxis, axes.length),
      ],
    };
  }
}

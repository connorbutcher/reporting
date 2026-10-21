import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  ChartSeriesBinding,
  ChartValueAxis,
  chartAxisIndex,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import { ChartQueryResult, ChartSeriesResult } from '../../../../../../core/models/widget-query';
import { ValueExtent } from '../axes/value-extent';
import { SeriesColors } from '../colors/series-colors';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { PointAxes } from './point-axes';
import { PointChart } from './point-chart';
import { PointSizeScale } from './point-size-scale';
import { PointTooltip } from './point-tooltip';
import { ChartCommentAnchor } from './types/chart-comment-anchor';
import { PointChartConfig } from './types/point-chart-config';
import { SeriesStyle } from './types/series-style';

/** Resolves a scatter or line chart's config and data into a {@link PointChart}. */
export class PointChartResolver {
  /** Null until there's a dataset and both axes are bound. */
  public static resolve(
    config: PointChartConfig,
    data: ChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
    commentAnchors: readonly ChartCommentAnchor[],
    highlightedAnchor: ChartCommentAnchor | null,
  ): PointChart | null {
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? null;
    const x = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const y = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    if (!x || !y) return null;

    const series = data?.series ?? [];
    const axes = readChartAxes(config);
    const xIsText = x.type === 'string';
    const xIsDate = x.type === 'dateTime';
    const yPrimaryIsText = y.type === 'string';
    const yPrimaryIsDate = y.type === 'dateTime';
    const xConfig = ChartFormat.numericConfig(x);
    const yConfig = ChartFormat.numericConfig(y);
    const xDateConfig = ChartFormat.dateConfig(x);
    const yDateConfig = ChartFormat.dateConfig(y);
    const seriesStyles = PointChartResolver.seriesStyles(series, bindings);
    const yExtent = ValueExtent.of(series.flatMap((s) => s.points.map((p) => p.y)));
    const colorByValue = !!config.colorByValue && !yPrimaryIsText && yExtent !== null;
    const showSeries = series.length > 1;

    return {
      config,
      data,
      series,
      axes,
      multiAxis: axes.length > 1,
      xColumn: x,
      xLabel: config.xAxisLabel.trim() || x.name,
      yLabel: axes[0].label.trim() || y.name,
      xIsText,
      xIsDate,
      yPrimaryIsText,
      yPrimaryIsDate,
      xConfig,
      yConfig,
      xDateConfig,
      yDateConfig,
      formatX: PointTooltip.formatterFor(xIsText, xIsDate, xConfig, xDateConfig),
      formatYPrimary: PointTooltip.formatterFor(
        yPrimaryIsText,
        yPrimaryIsDate,
        yConfig,
        yDateConfig,
      ),
      formatYOther: PointTooltip.formatterFor(false, false, undefined, undefined),
      xCategories: xIsText ? PointAxes.categories(series, 'x') : null,
      seriesAxisIndex: PointChartResolver.seriesAxisIndex(series, bindings, axes),
      seriesStyles,
      seriesColors: series.map(
        (s, i) => seriesStyles[i].color ?? SeriesColors.forSeries(colors, s.label, i),
      ),
      yExtent,
      colorByValue,
      sizeScale: PointSizeScale.fit(series, config.pointSize),
      showSeries,
      showLegend: showSeries && config.showLegend && !colorByValue,
      zoom: config.zoom ?? true,
      commentAnchors,
      highlightedAnchor,
    };
  }

  /**
   * Read live from each binding so edits re-render without a refetch. A colour-by split keeps the
   * palette colours.
   */
  private static seriesStyles(
    series: readonly ChartSeriesResult[],
    bindings: readonly ChartSeriesBinding[],
  ): SeriesStyle[] {
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const splitCounts = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId) splitCounts.set(s.bindingId, (splitCounts.get(s.bindingId) ?? 0) + 1);
    }
    return series.map((s) => {
      const binding = s.bindingId ? bindingsById.get(s.bindingId) : undefined;
      const split = (s.bindingId ? (splitCounts.get(s.bindingId) ?? 1) : 1) > 1;
      return {
        color: !split ? (binding?.color ?? null) : null,
        symbol: binding?.symbol ?? null,
        dashStyle: binding?.dashStyle ?? null,
      };
    });
  }

  private static seriesAxisIndex(
    series: readonly ChartSeriesResult[],
    bindings: readonly ChartSeriesBinding[],
    axes: ChartValueAxis[],
  ): number[] {
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    return series.map((s) =>
      chartAxisIndex(
        axes,
        (s.bindingId ? bindingsById.get(s.bindingId) : undefined)?.yAxisId ?? null,
      ),
    );
  }
}

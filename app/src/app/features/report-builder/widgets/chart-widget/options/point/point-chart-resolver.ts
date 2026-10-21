import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  ChartSeriesBinding,
  ChartValueAxis,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import { ChartQueryResult, ChartSeriesResult } from '../../../../../../core/models/widget-query';
import { ValueExtent } from '../axes/value-extent';
import { SeriesColors } from '../colors/series-colors';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { PointCategories } from './axes/point-categories';
import { PointChart } from './point-chart';
import { PointSeriesBindings } from './point-series-bindings';
import { PointSizeScale } from './point-size-scale';
import { PointTooltip } from './point-tooltip';
import { ChartCommentAnchor } from './types/chart-comment-anchor';
import { PointChartConfig } from './types/point-chart-config';

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
    const yFields = PointChartResolver.yFields(axes, y);
    return {
      config,
      data,
      series,
      axes,
      multiAxis: axes.length > 1,
      ...PointChartResolver.xFields(config, x, series),
      ...yFields,
      ...PointChartResolver.seriesFields(series, bindings, axes, colors),
      ...PointChartResolver.displayFields(config, series, yFields.yPrimaryIsText),
      commentAnchors,
      highlightedAnchor,
    };
  }

  private static xFields(
    config: PointChartConfig,
    x: DatasetColumn,
    series: ChartSeriesResult[],
  ): Pick<
    PointChart,
    | 'xColumn'
    | 'xLabel'
    | 'xIsText'
    | 'xIsDate'
    | 'xConfig'
    | 'xDateConfig'
    | 'formatX'
    | 'xCategories'
  > {
    const xIsText = x.type === 'string';
    const xIsDate = x.type === 'dateTime';
    const xConfig = ChartFormat.numericConfig(x);
    const xDateConfig = ChartFormat.dateConfig(x);
    return {
      xColumn: x,
      xLabel: config.xAxisLabel.trim() || x.name,
      xIsText,
      xIsDate,
      xConfig,
      xDateConfig,
      formatX: PointTooltip.formatterFor(xIsText, xIsDate, xConfig, xDateConfig),
      xCategories: xIsText ? PointCategories.of(series, 'x') : null,
    };
  }

  private static yFields(
    axes: ChartValueAxis[],
    y: DatasetColumn,
  ): Pick<
    PointChart,
    | 'yLabel'
    | 'yPrimaryIsText'
    | 'yPrimaryIsDate'
    | 'yConfig'
    | 'yDateConfig'
    | 'formatYPrimary'
    | 'formatYOther'
  > {
    const yPrimaryIsText = y.type === 'string';
    const yPrimaryIsDate = y.type === 'dateTime';
    const yConfig = ChartFormat.numericConfig(y);
    const yDateConfig = ChartFormat.dateConfig(y);
    return {
      yLabel: axes[0].label.trim() || y.name,
      yPrimaryIsText,
      yPrimaryIsDate,
      yConfig,
      yDateConfig,
      formatYPrimary: PointTooltip.formatterFor(
        yPrimaryIsText,
        yPrimaryIsDate,
        yConfig,
        yDateConfig,
      ),
      formatYOther: PointTooltip.formatterFor(false, false, undefined, undefined),
    };
  }

  private static seriesFields(
    series: ChartSeriesResult[],
    bindings: readonly ChartSeriesBinding[],
    axes: ChartValueAxis[],
    colors: Map<string, string>,
  ): Pick<PointChart, 'seriesAxisIndex' | 'seriesStyles' | 'seriesColors'> {
    const seriesStyles = PointSeriesBindings.styles(series, bindings);
    return {
      seriesAxisIndex: PointSeriesBindings.axisIndex(series, bindings, axes),
      seriesStyles,
      seriesColors: series.map(
        (s, i) => seriesStyles[i].color ?? SeriesColors.forSeries(colors, s.label, i),
      ),
    };
  }

  /** Colour-by-value needs a numeric Y and data, and replaces the legend. */
  private static displayFields(
    config: PointChartConfig,
    series: ChartSeriesResult[],
    yPrimaryIsText: boolean,
  ): Pick<
    PointChart,
    'yExtent' | 'colorByValue' | 'sizeScale' | 'showSeries' | 'showLegend' | 'zoom'
  > {
    const yExtent = ValueExtent.of(series.flatMap((s) => s.points.map((p) => p.y)));
    const colorByValue = !!config.colorByValue && !yPrimaryIsText && yExtent !== null;
    const showSeries = series.length > 1;
    return {
      yExtent,
      colorByValue,
      sizeScale: PointSizeScale.fit(series, config.pointSize),
      showSeries,
      showLegend: showSeries && config.showLegend && !colorByValue,
      zoom: config.zoom ?? true,
    };
  }
}

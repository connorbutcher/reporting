import { ChartZoomMemory } from '../../chart-zoom';
import { DatasetColumn } from '../../../../../../core/models/dataset';
import {
  chartAxisIndex,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import { ChartQueryResult, ChartSeriesResult } from '../../../../../../core/models/widget-query';
import { ECOption } from '../types/ec-option';
import { LabelCallbackParams } from '../types/label-callback-params';
import { TooltipCallbackParams } from '../types/tooltip-callback-params';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { ChartScale } from '../axes/chart-scale';
import { PointAxes } from './point-axes';
import { PointSeries } from './point-series';
import { PointTooltip } from './point-tooltip';
import { PointChartConstants } from './point-chart-constants';
import { ChartCommentAnchor } from './types/chart-comment-anchor';
import { Coord } from './types/coord';
import { PointChartConfig } from './types/point-chart-config';
import { ScatterTooltipParams } from './types/scatter-tooltip-params';
import { SeriesStyle } from './types/series-style';
import { SizeScale } from './types/size-scale';
import { GuideLineMarks } from '../marks/guide-line-marks';
import { GuideLineOutline } from '../marks/guide-line-outline';
import { OutlineSeverity } from '../marks/outline-severity';
import { ReferenceSeries } from '../marks/reference-series';
import { SeriesColors } from '../colors/series-colors';
import { ToleranceMarks } from '../marks/tolerance-marks';
import { ToleranceOutline } from '../marks/tolerance-outline';
import { AxisKey } from '../types/axis-key';

/** Scatter/line chart: value axes with one mark per row, grouped into series. */
export class PointOption {
  // Colourblind-safe blue→red ramp (RdYlBu, reversed) for colour-by-value.
  private static readonly VALUE_COLOR_SCALE = [
    '#2c7bb6',
    '#abd9e9',
    '#ffffbf',
    '#fdae61',
    '#d7191c',
  ];
  // Bubble diameter range; unsized points keep the chart's fixed pointSize.
  private static readonly MIN_BUBBLE_PX = 8;
  private static readonly MAX_BUBBLE_PX = 40;

  /** Null until there's a dataset and both axes are bound. */
  public static build(
    config: PointChartConfig,
    data: ChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
    commentAnchors: readonly ChartCommentAnchor[] = [],
    highlightedAnchor: ChartCommentAnchor | null = null,
  ): ECOption | null {
    const primary = readChartBindings(config).find((b) => b.datasetId) ?? null;
    const x = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const y = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    if (!x || !y) return null;

    const series = data?.series ?? [];
    const axes = readChartAxes(config);
    const xLabel = config.xAxisLabel.trim() || x.name;
    const yLabel = axes[0].label.trim() || y.name;

    // Only the primary Y column's type is known here, so date Y axes are primary-only.
    const xIsText = x.type === 'string';
    const xIsDate = x.type === 'dateTime';
    const yPrimaryIsText = y.type === 'string';
    const yPrimaryIsDate = y.type === 'dateTime';
    const xConfig = ChartFormat.numericConfig(x);
    const yConfig = ChartFormat.numericConfig(y);
    const xDateCfg = ChartFormat.dateConfig(x);
    const yDateCfg = ChartFormat.dateConfig(y);
    const formatX = PointTooltip.formatterFor(xIsText, xIsDate, xConfig, xDateCfg);
    const formatYPrimary = PointTooltip.formatterFor(
      yPrimaryIsText,
      yPrimaryIsDate,
      yConfig,
      yDateCfg,
    );
    const formatYOther = PointTooltip.formatterFor(false, false, undefined, undefined);
    const xData = xIsText ? PointAxes.categories(series, 'x') : null;
    const xScale = xIsDate
      ? ChartScale.dateAxis(xDateCfg)
      : xIsText
        ? ChartScale.categoryAxis(xData ?? [], config.xAxisInterval)
        : ChartScale.numericAxis(
            config.xLogScale,
            config.xAxisMin,
            config.xAxisMax,
            config.xAxisInterval,
            xConfig,
            config.xAxisScale,
          );
    const xRotate = ChartScale.labelRotate(config.xAxisRotate);
    const showGridLines = config.showGridLines ?? true;
    // Colour-by-value needs a numeric Y and data; it replaces the legend.
    const yExtent = PointOption.extent(series, 'y');
    const colorByValue = !!config.colorByValue && !yPrimaryIsText && yExtent !== null;
    // One shared bubble scale so sizes compare across series; null when nothing is sized.
    const sizeScale = PointOption.sizeScale(series, config.pointSize);
    const xLongest = xIsText
      ? ChartScale.longestLen(xData ?? [])
      : PointOption.extentLabelLen(series, 'x', formatX);
    const xNameGap = ChartScale.nameGap(xLongest, xRotate, 'x');
    const names = series.map((s) => s.label);
    const showSeries = series.length > 1;

    const bands = data?.toleranceBands ?? [];
    // Resolved bands lose their axis, so read it from the config; x-bands group with the primary.
    const bandYAxisId = new Map(config.toleranceBands.map((b) => [b.id, b.yAxisId ?? null]));
    const bandAxis = new Map(
      bands.map((b) => [
        b,
        b.axis === 'x' ? 0 : chartAxisIndex(axes, bandYAxisId.get(b.id) ?? null),
      ]),
    );

    // Read live from each binding so edits re-render without a refetch. A colour-by split
    // keeps the palette colours.
    const bindingsById = new Map(readChartBindings(config).map((b) => [b.id, b]));
    const splitCounts = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId) splitCounts.set(s.bindingId, (splitCounts.get(s.bindingId) ?? 0) + 1);
    }
    const seriesAxisIndex = series.map((s) =>
      chartAxisIndex(
        axes,
        (s.bindingId ? bindingsById.get(s.bindingId) : undefined)?.yAxisId ?? null,
      ),
    );
    const seriesStyle: SeriesStyle[] = series.map((s) => {
      const binding = s.bindingId ? bindingsById.get(s.bindingId) : undefined;
      const split = (s.bindingId ? (splitCounts.get(s.bindingId) ?? 1) : 1) > 1;
      return {
        color: !split ? (binding?.color ?? null) : null,
        symbol: binding?.symbol ?? null,
        dashStyle: binding?.dashStyle ?? null,
      };
    });

    const seriesColors = series.map(
      (s, i) => seriesStyle[i].color ?? SeriesColors.forSeries(colors, s.label, i),
    );
    const indicesByAxis = new Map<number, number[]>();
    series.forEach((_, i) => {
      const k = seriesAxisIndex[i];
      const list = indicesByAxis.get(k);
      if (list) list.push(i);
      else indicesByAxis.set(k, [i]);
    });

    const multiAxis = axes.length > 1;
    const yAxisDefs = PointAxes.buildY({
      axes,
      series,
      indicesByAxis,
      seriesColors,
      yLabel,
      yConfig,
      yDateCfg,
      yPrimaryIsText,
      yPrimaryIsDate,
      showGridLines: config.showGridLines ?? true,
    });
    const leftCount = axes.filter((a) => a.side === 'left').length;
    const rightCount = axes.filter((a) => a.side === 'right').length;

    // Reference marks ride a carrier series per Y axis, so hiding a data series keeps them.
    const guideLines = config.guideLines ?? [];
    const guideLineAxis = new Map(
      guideLines.map((l) => [l, l.axis === 'x' ? 0 : chartAxisIndex(axes, l.yAxisId ?? null)]),
    );
    const referenceSeries = axes.flatMap((_, k) => {
      const axisBands = bands.filter((b) => bandAxis.get(b) === k);
      const axisLines = guideLines.filter((l) => guideLineAxis.get(l) === k);
      const reference = ReferenceSeries.build(
        [
          ...ToleranceMarks.lines(axisBands, PointOption.axisKeyOf),
          ...GuideLineMarks.lines(axisLines, PointOption.axisKeyOf),
        ],
        [
          ...ToleranceMarks.areas(axisBands, PointOption.axisKeyOf),
          ...GuideLineMarks.areas(axisLines, PointOption.axisKeyOf),
        ],
        multiAxis ? { yAxisIndex: k } : {},
      );
      return reference ? [reference] : [];
    });

    const outlineByAxis = new Map(
      [...new Set(seriesAxisIndex)].map((k) => [
        k,
        OutlineSeverity.forPoints([
          ...ToleranceOutline.zonesFor(
            bands.filter((b) => b.axis === 'x' || bandAxis.get(b) === k),
          ),
          ...GuideLineOutline.zonesFor(
            guideLines.filter((l) => l.axis === 'x' || guideLineAxis.get(l) === k),
          ),
        ]),
      ]),
    );

    const zoom = config.zoom ?? true;
    const showLegendNow = showSeries && config.showLegend && !colorByValue;
    const topReserved = showLegendNow || colorByValue;
    const trendReserve = config.showTrendLine ? PointSeries.trendLabelReserve(series, xIsDate) : 0;

    return {
      // Dates are UTC epoch millis, so lay time axes out in UTC to avoid local-midnight ticks.
      useUTC: true,
      grid: {
        left: 56 + Math.max(0, leftCount - 1) * PointChartConstants.AXIS_OFFSET,
        right: 20 + rightCount * PointChartConstants.AXIS_OFFSET + trendReserve,
        top: topReserved ? 40 : 20,
        bottom: zoom ? 76 : 48,
        containLabel: true,
        // Keep axis names on-canvas too; echarts shrinks the plot instead of clipping.
        outerBoundsContain: 'all',
      },
      tooltip: {
        trigger: 'item',
        // The widget clips to rounded corners, so render the tooltip on <body> and confine it
        // to the viewport.
        appendToBody: true,
        confine: true,
        formatter: (raw: TooltipCallbackParams) => {
          const params = raw as unknown as ScatterTooltipParams;
          // A series on a secondary axis has no column in the shared schema, so use plain grouping.
          const onPrimary = (seriesAxisIndex[params.seriesIndex] ?? 0) === 0;
          return PointTooltip.format(
            params,
            showSeries,
            xLabel,
            yLabel,
            formatX,
            onPrimary ? formatYPrimary : formatYOther,
          );
        },
      },
      ...(showLegendNow ? { legend: { top: 0, data: names, type: 'scroll' } } : {}),
      ...(colorByValue && yExtent
        ? {
            visualMap: {
              type: 'continuous',
              min: yExtent.min,
              max: yExtent.max,
              dimension: 1,
              calculable: true,
              orient: 'horizontal',
              left: 'center',
              top: 0,
              text: [formatYPrimary(yExtent.max), formatYPrimary(yExtent.min)],
              inRange: { color: PointOption.VALUE_COLOR_SCALE },
            },
          }
        : {}),
      ...(zoom || config.zoomY
        ? {
            dataZoom: [
              ...(zoom
                ? [
                    { type: 'inside' as const, xAxisIndex: 0 },
                    { type: 'slider' as const, xAxisIndex: 0, height: 20, bottom: 12 },
                  ]
                : []),
              ...(config.zoomY
                ? [{ type: 'inside' as const, yAxisIndex: 0, id: ChartZoomMemory.VALUE_ZOOM_ID }]
                : []),
            ],
          }
        : {}),
      xAxis: {
        ...xScale,
        ...(xRotate !== 0 ? { axisLabel: { ...xScale.axisLabel, rotate: xRotate } } : {}),
        name: xLabel,
        nameLocation: 'middle',
        nameGap: xNameGap,
        splitLine: { show: showGridLines && !xIsText },
      },
      yAxis: multiAxis ? yAxisDefs : yAxisDefs[0],
      series: [
        ...series.flatMap((s, i) => {
          const color = seriesColors[i];
          const axisK = seriesAxisIndex[i];
          const onPrimary = axisK === 0;
          // The visualMap drives the fill, so drop the series colour and per-point outline.
          const outlineColor = colorByValue
            ? () => null
            : (outlineByAxis.get(axisK) ?? (() => null));
          const formatY = onPrimary ? formatYPrimary : formatYOther;
          const yAxisIndex = multiAxis ? Math.min(axisK, axes.length - 1) : null;
          const mainName = s.label || config.title || 'Series';
          const main = {
            name: mainName,
            ...PointSeries.kindOptions(config, color, seriesStyle[i], sizeScale),
            ...(colorByValue ? {} : { itemStyle: { color } }),
            data: PointSeries.points(s, color, outlineColor),
            ...(config.showValueLabels
              ? {
                  label: {
                    show: true,
                    position: 'top' as const,
                    formatter: (p: LabelCallbackParams) => formatY((p.value as [Coord, Coord])[1]),
                  },
                }
              : {}),
            ...(yAxisIndex !== null ? { yAxisIndex } : {}),
          };
          // Shares `mainName` so it has no legend entry but toggles with its series.
          const trend = config.showTrendLine
            ? PointSeries.trendLine(s, mainName, color, yAxisIndex, xIsDate)
            : null;
          return trend ? [main, trend] : [main];
        }),
        ...referenceSeries,
        ...PointSeries.anchorMarkers(commentAnchors, multiAxis, axes.length),
        ...PointSeries.highlightMarker(highlightedAnchor, multiAxis, axes.length),
      ],
    };
  }

  private static axisKeyOf(item: { axis: 'x' | 'y' }): AxisKey {
    return item.axis === 'x' ? 'xAxis' : 'yAxis';
  }

  /** The longest tick label, estimated by formatting the data extent, to size the name gap. */
  private static extentLabelLen(
    series: readonly ChartSeriesResult[],
    dim: 'x' | 'y',
    format: (value: Coord) => string,
  ): number {
    const extent = PointOption.extent(series, dim);
    if (!extent) return 0;
    return Math.max(format(extent.min).length, format(extent.max).length);
  }

  /**
   * A shared bubble scale over every bound size value, or null when none. Diameter grows with the
   * square root so bubble area tracks the value.
   */
  private static sizeScale(
    series: readonly ChartSeriesResult[],
    fallbackPointSize: number,
  ): SizeScale | null {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (const p of s.points) {
        if (typeof p.size !== 'number') continue;
        if (p.size < min) min = p.size;
        if (p.size > max) max = p.size;
      }
    }
    if (!Number.isFinite(min)) return null;

    return (size) => {
      if (typeof size !== 'number') return fallbackPointSize;
      if (max === min) return (PointOption.MIN_BUBBLE_PX + PointOption.MAX_BUBBLE_PX) / 2;
      const t = (size - min) / (max - min);
      return (
        PointOption.MIN_BUBBLE_PX +
        Math.sqrt(t) * (PointOption.MAX_BUBBLE_PX - PointOption.MIN_BUBBLE_PX)
      );
    };
  }

  private static extent(
    series: readonly ChartSeriesResult[],
    dim: 'x' | 'y',
  ): { min: number; max: number } | null {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (const p of s.points) {
        const v = dim === 'x' ? p.x : p.y;
        if (typeof v === 'number') {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    return Number.isFinite(min) ? { min, max } : null;
  }
}

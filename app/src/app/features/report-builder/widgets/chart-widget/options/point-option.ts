import { DatasetColumn } from '../../../../../core/models/dataset';
import { chartAxisIndex, readChartAxes, readChartBindings } from '../../../../../core/models/report';
import { ChartQueryResult, ChartSeriesResult, ResolvedToleranceBand } from '../../../../../core/models/widget-query';
import { ECOption, LabelCallbackParams, MarkAreaData, MarkLineData, TooltipCallbackParams } from './chart-option.types';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { PointAxes } from './point-axes';
import { PointSeries } from './point-series';
import { PointTooltip } from './point-tooltip';
import { AXIS_OFFSET, Coord, PointChartConfig, ScatterTooltipParams, SeriesStyle } from './point-types';
import { SeriesColors } from './series-colors';
import { ToleranceMarks } from './tolerance-marks';
import { ToleranceOutline } from './tolerance-outline';

// A perceptual-ish, colourblind-safe blue→red ramp for the colour-by-value scale (RdYlBu, reversed).
const VALUE_COLOR_SCALE = ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'];

/** Builds the scatter/line echarts option: value axes with one mark per row, grouped into series. */
export class PointOption {
  /** Null until there's a dataset and both axes are bound. */
  public static build(
    config: PointChartConfig,
    data: ChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    // The first bound binding names the shared axes; its dataset's columns are `columns`.
    const primary = readChartBindings(config).find((b) => b.datasetId) ?? null;
    const x = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const y = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    if (!x || !y) return null;

    const series = data?.series ?? [];
    const axes = readChartAxes(config);
    const xLabel = config.xAxisLabel.trim() || x.name;
    // The primary axis and the tooltip share this label; secondary axes carry their own.
    const yLabel = axes[0].label.trim() || y.name;

    // The X axis is shared (reads the primary binding's column); only the primary Y column's
    // kind is known here, so a date Y axis is supported on the primary only.
    const xIsText = x.type === 'string';
    const xIsDate = x.type === 'dateTime';
    const yPrimaryIsText = y.type === 'string';
    const yPrimaryIsDate = y.type === 'dateTime';
    const xConfig = ChartFormat.numericConfig(x);
    const yConfig = ChartFormat.numericConfig(y);
    const xDateCfg = ChartFormat.dateConfig(x);
    const yDateCfg = ChartFormat.dateConfig(y);
    const formatX = PointTooltip.formatterFor(xIsText, xIsDate, xConfig, xDateCfg);
    const formatYPrimary = PointTooltip.formatterFor(yPrimaryIsText, yPrimaryIsDate, yConfig, yDateCfg);
    const formatYOther = PointTooltip.formatterFor(false, false, undefined, undefined);
    const xData = xIsText ? PointAxes.categories(series, 'x') : null;
    // The shared X axis's scale fragment and label rotation, hoisted so the assembled axis can
    // layer rotation over the fragment's own label config.
    const xScale = xIsDate
      ? ChartScale.dateAxis(xDateCfg)
      : xIsText
        ? ChartScale.categoryAxis(xData ?? [], config.xAxisInterval)
        : ChartScale.numericAxis(config.xLogScale, config.xAxisMin, config.xAxisMax, config.xAxisInterval, xConfig, config.xAxisScale);
    const xRotate = ChartScale.labelRotate(config.xAxisRotate);
    const showGridLines = config.showGridLines ?? true;
    // Colour-by-value maps the Y value to a continuous colour scale (visualMap). Only meaningful
    // with a numeric Y and actual data; when on it drives the mark colours and replaces the legend.
    const yExtent = PointOption.extent(series, 'y');
    const colorByValue = !!config.colorByValue && !yPrimaryIsText && yExtent !== null;
    // Size the X name's gap to clear its tick labels (category labels verbatim, else the
    // widest formatted data value), so the two never overlap.
    const xLongest = xIsText
      ? ChartScale.longestLen(xData ?? [])
      : PointOption.extentLabelLen(series, 'x', formatX);
    const xNameGap = ChartScale.nameGap(xLongest, xRotate, 'x');
    const names = series.map((s) => s.label);
    // A legend and per-series name only earn their place with more than one series.
    const showSeries = series.length > 1;

    const bands = data?.toleranceBands ?? [];
    const axisKeyFor = (band: { axis: 'x' | 'y' }): 'xAxis' | 'yAxis' =>
      band.axis === 'x' ? 'xAxis' : 'yAxis';
    // Resolved bands don't carry their target axis, so read it from the config bands they came
    // from; an x-band sits on the shared X axis and is grouped with the primary (index 0).
    const bandYAxisId = new Map(config.toleranceBands.map((b) => [b.id, b.yAxisId ?? null]));
    const bandAxisIndex = (band: ResolvedToleranceBand): number =>
      band.axis === 'x' ? 0 : chartAxisIndex(axes, bandYAxisId.get(band.id) ?? null);

    // Each series' presentation comes from its binding's *current* config, so editing it
    // re-renders without a refetch. A colour-by split drops the colour override to keep the
    // palette's per-value colours; marker and dash apply either way.
    const bindingsById = new Map(readChartBindings(config).map((b) => [b.id, b]));
    const splitCounts = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId) splitCounts.set(s.bindingId, (splitCounts.get(s.bindingId) ?? 0) + 1);
    }
    const seriesAxisIndex = series.map((s) =>
      chartAxisIndex(axes, (s.bindingId ? bindingsById.get(s.bindingId) : undefined)?.yAxisId ?? null),
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

    const seriesColors = series.map((s, i) => seriesStyle[i].color ?? SeriesColors.forSeries(colors, s.label, i));
    // Groups series by the Y axis they plot on — used to colour an axis to match its series,
    // infer a secondary axis's type, and hang each axis's bands on one of its own series.
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

    // markLine/markArea coordinates read against the axis of the series they hang on. A Y band
    // hangs on a series plotted on its target axis; an X band rides the first series (index 0).
    const marksBySeries = new Map<number, { marks: MarkLineData; areas: MarkAreaData }>();
    const hangBands = (seriesIdx: number, axisBands: ResolvedToleranceBand[]): void => {
      const marks = ToleranceMarks.lines(axisBands, axisKeyFor);
      const areas = ToleranceMarks.areas(axisBands, axisKeyFor);
      if (marks.length === 0 && areas.length === 0) return;
      const existing = marksBySeries.get(seriesIdx);
      if (existing) {
        existing.marks.push(...marks);
        existing.areas.push(...areas);
      } else {
        marksBySeries.set(seriesIdx, { marks, areas });
      }
    };
    for (const [k, indices] of indicesByAxis) {
      hangBands(indices[0], bands.filter((b) => b.axis === 'y' && bandAxisIndex(b) === k));
    }
    if (series.length > 0) {
      hangBands(0, bands.filter((b) => b.axis === 'x'));
    }

    // One out-of-tolerance test per Y axis, memoised and shared by every series on that axis.
    const outlineByAxis = new Map<number, (x: Coord, y: Coord) => string | null>();
    const outlineFor = (axisK: number): ((x: Coord, y: Coord) => string | null) => {
      let outline = outlineByAxis.get(axisK);
      if (!outline) {
        outline = ToleranceOutline.forPoints(bands.filter((b) => b.axis === 'x' || bandAxisIndex(b) === axisK));
        outlineByAxis.set(axisK, outline);
      }
      return outline;
    };

    // A zoom slider needs room below the axis; leave the tighter margin when off.
    const zoom = config.zoom ?? true;
    // The legend shows series colours; colour-by-value replaces it with the value scale, so only
    // one of the two occupies the top strip at a time.
    const showLegendNow = showSeries && config.showLegend && !colorByValue;
    const topReserved = showLegendNow || colorByValue;

    return {
      // Date axes are plotted from UTC-epoch millis and labelled in UTC, so lay time axes out
      // in UTC too — otherwise tick boundaries fall on the viewer's local midnights.
      useUTC: true,
      grid: {
        left: 56 + Math.max(0, leftCount - 1) * AXIS_OFFSET,
        right: 20 + rightCount * AXIS_OFFSET,
        top: topReserved ? 40 : 20,
        bottom: zoom ? 76 : 48,
        containLabel: true,
        // Contain the axis *names* too (not just their labels), so a name pushed further out by a
        // wide/rotated label set is kept on-canvas — echarts shrinks the plot instead of clipping.
        outerBoundsContain: 'all',
      },
      tooltip: {
        trigger: 'item',
        formatter: (raw: TooltipCallbackParams) => {
          // echarts types the param loosely (it can be an array under other triggers); an item
          // tooltip always gets one, carrying our per-point payload (`ScatterTooltipParams`).
          const params = raw as unknown as ScatterTooltipParams;
          // The Y value reads through the axis it plots on: the primary's format, or plain
          // grouping for a series on a secondary axis (whose column the shared schema lacks).
          const onPrimary = (seriesAxisIndex[params.seriesIndex] ?? 0) === 0;
          return PointTooltip.format(params, showSeries, xLabel, yLabel, formatX, onPrimary ? formatYPrimary : formatYOther);
        },
      },
      // `scroll` paginates the legend rather than letting many colour-by series overflow the plot.
      ...(showLegendNow ? { legend: { top: 0, data: names, type: 'scroll' } } : {}),
      // Colour marks by their Y value on a continuous scale, shown as a horizontal bar up top.
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
              inRange: { color: VALUE_COLOR_SCALE },
            },
          }
        : {}),
      // Wheel/drag zoom: a slider + inside along X, and inside along Y when enabled.
      ...(zoom || config.zoomY
        ? {
            dataZoom: [
              ...(zoom
                ? [
                    { type: 'inside' as const, xAxisIndex: 0 },
                    { type: 'slider' as const, xAxisIndex: 0, height: 20, bottom: 12 },
                  ]
                : []),
              ...(config.zoomY ? [{ type: 'inside' as const, yAxisIndex: 0 }] : []),
            ],
          }
        : {}),
      xAxis: {
        // The scale fragment carries the axis `type` (and, for a category axis, its `data`);
        // a non-default rotation layers over its own label config.
        ...xScale,
        ...(xRotate !== 0 ? { axisLabel: { ...xScale.axisLabel, rotate: xRotate } } : {}),
        name: xLabel,
        nameLocation: 'middle',
        nameGap: xNameGap,
        // Vertical gridlines follow the chart-wide toggle; a category X never draws them.
        splitLine: { show: showGridLines && !xIsText },
      },
      yAxis: multiAxis ? yAxisDefs : yAxisDefs[0],
      series: series.map((s, i) => {
        const color = seriesColors[i];
        const axisK = seriesAxisIndex[i];
        const onPrimary = axisK === 0;
        // Colour-by-value drives the fill from the visualMap, so drop the per-series colour and the
        // per-point outline (the value colour already conveys where a mark sits).
        const outlineColor = colorByValue ? () => null : outlineFor(axisK);
        const formatY = onPrimary ? formatYPrimary : formatYOther;
        const hung = marksBySeries.get(i);
        return {
          name: s.label || config.title || 'Series',
          ...PointSeries.kindOptions(config, color, seriesStyle[i]),
          ...(colorByValue ? {} : { itemStyle: { color } }),
          data: PointSeries.points(s, color, outlineColor),
          ...(config.showValueLabels
            ? {
                label: {
                  show: true,
                  position: 'top' as const,
                  formatter: (p: LabelCallbackParams) =>
                    formatY((p.value as [Coord, Coord])[1]),
                },
              }
            : {}),
          ...(multiAxis ? { yAxisIndex: Math.min(axisK, axes.length - 1) } : {}),
          ...(hung && hung.marks.length > 0
            ? { markLine: { silent: true, symbol: 'none', data: hung.marks } }
            : {}),
          ...(hung && hung.areas.length > 0 ? { markArea: { silent: true, data: hung.areas } } : {}),
        };
      }),
    };
  }

  /**
   * The longest tick label a numeric/date axis will show, in characters, from its data extent.
   * Formatting just the min and max (widest by magnitude) approximates the widest tick without
   * knowing echarts' chosen ticks — enough to size a non-overlapping {@link ChartScale.nameGap}.
   */
  private static extentLabelLen(
    series: readonly ChartSeriesResult[],
    dim: 'x' | 'y',
    format: (value: Coord) => string,
  ): number {
    const extent = PointOption.extent(series, dim);
    if (!extent) return 0;
    return Math.max(format(extent.min).length, format(extent.max).length);
  }

  /** The numeric [min, max] of a dimension across all series, or null when it has no numbers. */
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

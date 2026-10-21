import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import {
  ChartGuideLine,
  ComboChartWidgetConfig,
  chartAxisIndex,
  readChartAxes,
  readChartBindings,
} from '../../../../../core/models/report';
import {
  BarChartQueryResult,
  BarSeriesResult,
  ResolvedToleranceBand,
} from '../../../../../core/models/widget-query';
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import type { YAXisComponentOption } from 'echarts';
import { ECOption } from './types/ec-option';
import { LabelCallbackParams } from './types/label-callback-params';
import { BarOption } from './bar-option';
import { CategoryZoom } from './category-zoom';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { GuideLineMarks } from './guide-line-marks';
import { GuideLineOutline } from './guide-line-outline';
import { OutlineSeverity } from './outline-severity';
import { PointChartConstants } from './point-chart-constants';
import { ReferenceSeries } from './reference-series';
import { SeriesColors } from './series-colors';
import { ToleranceMarks } from './tolerance-marks';
import { ToleranceOutline } from './tolerance-outline';
import { ComboSeries } from './types/combo-series';

/**
 * Builds the combination echarts option: a shared category axis with one aggregated value per
 * category per series (the bar chart's data), where each series draws as bars or as a line, and
 * series can sit on separate value axes. Reuses the bar query result verbatim — only the series'
 * echarts `type` and per-line styling differ from {@link BarOption}.
 */
export class ComboOption {
  /** Null until there's a dataset and a category column bound. */
  public static build(
    config: ComboChartWidgetConfig,
    data: BarChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!categoryColumn) return null;

    const categories = data?.categories ?? [];
    const rawSeries = data?.series ?? [];
    const axes = readChartAxes(config);

    // Each series' render kind, axis, and colour come from the binding it belongs to, resolved live
    // so editing the binding re-renders without a refetch. A binding contributing a single series
    // may override its colour; once it splits (several measures or a colour-by column) each series
    // keeps its palette colour so the split stays legible.
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const seriesPerBinding = new Map<string, number>();
    for (const s of rawSeries) {
      if (s.bindingId)
        seriesPerBinding.set(s.bindingId, (seriesPerBinding.get(s.bindingId) ?? 0) + 1);
    }

    const series: ComboSeries[] = rawSeries.map((result, i) => {
      const binding = result.bindingId ? bindingsById.get(result.bindingId) : undefined;
      const single =
        (result.bindingId ? (seriesPerBinding.get(result.bindingId) ?? 1) : rawSeries.length) === 1;
      const override = single ? (binding?.color ?? null) : null;
      return {
        result,
        axisIndex: chartAxisIndex(axes, binding?.yAxisId ?? null),
        renderAs: binding?.renderAs ?? 'bar',
        color: override ?? SeriesColors.forSeries(colors, result.label, i),
        symbol: binding?.symbol ?? null,
        dashStyle: binding?.dashStyle ?? null,
      };
    });

    // A count has no measure, so it never borrows a leftover value column's units; otherwise each
    // series reads through its own measure's format, and the primary axis through the shared one.
    const isCount = config.aggregate === 'count';
    const primaryMeasures = isCount
      ? []
      : [
          ...new Set(
            series
              .filter((s) => s.axisIndex === 0)
              .map((s) => s.result.valueColumnId ?? primary?.yColumnId ?? null)
              .filter((id) => id != null),
          ),
        ];
    const valueColumn =
      primaryMeasures.length === 1 ? ChartColumns.byId(columns, primaryMeasures[0]) : null;
    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const seriesConfig = (s: BarSeriesResult): NumericColumnConfig | undefined =>
      isCount
        ? undefined
        : (ChartFormat.numericConfig(ChartColumns.byId(columns, s.valueColumnId ?? null)) ??
          valueConfig);
    const formatValue = (s: BarSeriesResult) => (v: number) =>
      ChartFormat.numeric(v, seriesConfig(s));
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    const primaryValueLabel =
      axes[0].label.trim() || BarOption.measureLabel(config.aggregate, valueColumn?.name ?? null);

    const showLegend = series.length > 1 && config.showLegend;
    const showGridLines = config.showGridLines ?? true;

    // Long category lists overlap on a vertical axis, so auto-tilt once there are a few — unless the
    // user picked an explicit orientation, which wins.
    const categoryAutoRotate = categories.length > 6 ? 30 : 0;
    const categoryRotate = ChartScale.labelRotate(config.xAxisRotate, categoryAutoRotate);
    const categoryScale = ChartScale.categoryAxis(categories, config.xAxisInterval);
    const categoryAxis = {
      ...categoryScale,
      name: categoryLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(ChartScale.longestLen(categories), categoryRotate, 'x'),
      axisLabel: { ...categoryScale.axisLabel, rotate: categoryRotate },
    };

    const seriesColors = series.map((s) => s.color);
    const indicesByAxis = new Map<number, number[]>();
    series.forEach((s, i) => {
      const list = indicesByAxis.get(s.axisIndex);
      if (list) list.push(i);
      else indicesByAxis.set(s.axisIndex, [i]);
    });
    const yAxes = ComboOption.valueAxes({
      config,
      series,
      indicesByAxis,
      seriesColors,
      primaryValueLabel,
      valueConfig,
      showGridLines,
    });
    const multiAxis = axes.length > 1;
    const leftCount = axes.filter((a) => a.side === 'left').length;
    const rightCount = axes.filter((a) => a.side === 'right').length;

    // Reference lines/areas hang on the value axis: a y-band on the first series of its target
    // axis, so its coordinates read against the right scale. (Combo bands sit on the value axis;
    // an x-band would need a numeric category axis, which this chart never has.)
    const bands = (data?.toleranceBands ?? []).filter((b) => b.axis === 'y');
    const bandYAxisId = new Map(config.toleranceBands.map((b) => [b.id, b.yAxisId ?? null]));
    const bandAxisIndex = (band: ResolvedToleranceBand): number =>
      chartAxisIndex(axes, bandYAxisId.get(band.id) ?? null);
    const guideLines = (config.guideLines ?? []).filter((l) => l.axis === 'y');
    const guideLineYAxisId = new Map(guideLines.map((l) => [l.id, l.yAxisId ?? null]));
    const guideLineAxisIndex = (line: ChartGuideLine): number =>
      chartAxisIndex(axes, guideLineYAxisId.get(line.id) ?? null);

    // Each axis' reference lines ride their own carrier series, so hiding a data series in the
    // legend never takes them with it.
    const referenceSeries: LineSeriesOption[] = [];
    for (const k of axes.keys()) {
      const axisBands = bands.filter((b) => bandAxisIndex(b) === k);
      const axisLines = guideLines.filter((l) => guideLineAxisIndex(l) === k);
      const marks = [
        ...ToleranceMarks.lines(axisBands, () => 'yAxis'),
        ...GuideLineMarks.lines(axisLines, () => 'yAxis'),
      ];
      const areas = [
        ...ToleranceMarks.areas(axisBands, () => 'yAxis'),
        ...GuideLineMarks.areas(axisLines, () => 'yAxis'),
      ];
      const reference = ReferenceSeries.build(marks, areas, multiAxis ? { yAxisIndex: k } : {});
      if (reference) referenceSeries.push(reference);
    }
    // One out-of-tolerance test per axis, shared by every series on it — bands and outlined guide
    // lines on that axis both contribute zones, worst-wins.
    const outlineByAxis = new Map<number, (v: number) => string | null>();
    const outlineFor = (axisK: number): ((v: number) => string | null) => {
      let outline = outlineByAxis.get(axisK);
      if (!outline) {
        const zones = [
          ...ToleranceOutline.zonesFor(bands.filter((b) => bandAxisIndex(b) === axisK)),
          ...GuideLineOutline.zonesFor(guideLines.filter((l) => guideLineAxisIndex(l) === axisK)),
        ];
        outline = OutlineSeverity.forValue(zones);
        outlineByAxis.set(axisK, outline);
      }
      return outline;
    };

    const seriesName = (s: BarSeriesResult) => s.label || config.title || 'Series';
    const seriesByName = new Map(rawSeries.map((s) => [seriesName(s), s]));
    const zoom = CategoryZoom.enabled(config.zoom, categories.length);

    return {
      grid: {
        left: 56 + Math.max(0, leftCount - 1) * PointChartConstants.AXIS_OFFSET,
        right: 20 + rightCount * PointChartConstants.AXIS_OFFSET,
        top: showLegend ? 40 : 20,
        bottom: zoom ? 76 : 56,
        containLabel: true,
        outerBoundsContain: 'all',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendToBody: true,
        confine: true,
        formatter: (raw: unknown) => BarOption.tooltip(raw, seriesByName, formatValue, false),
      },
      ...(showLegend
        ? { legend: { top: 0, data: series.map((s) => seriesName(s.result)), type: 'scroll' } }
        : {}),
      ...(zoom ? { dataZoom: CategoryZoom.dataZoom(false) } : {}),
      xAxis: categoryAxis,
      yAxis: multiAxis ? yAxes : yAxes[0],
      series: [
        ...series.map((s) => {
          const outline = outlineFor(s.axisIndex);
          const format = formatValue(s.result);
          const base = {
            name: seriesName(s.result),
            ...(multiAxis ? { yAxisIndex: Math.min(s.axisIndex, axes.length - 1) } : {}),
            ...(config.showValueLabels
              ? {
                  label: {
                    show: true,
                    position: 'top' as const,
                    formatter: (p: LabelCallbackParams) =>
                      typeof p.value === 'number' ? format(p.value) : '',
                  },
                }
              : {}),
          };

          return s.renderAs === 'line'
            ? ComboOption.lineSeries(s, base, config)
            : ComboOption.barSeries(s, base, config, outline);
        }),
        ...referenceSeries,
      ],
    };
  }

  /** A bar series: stacked per binding when the chart stacks, with each bar outlined if it crosses a band. */
  private static barSeries(
    s: ComboSeries,
    base: object,
    config: ComboChartWidgetConfig,
    outline: (v: number) => string | null,
  ): BarSeriesOption {
    return {
      ...base,
      type: 'bar',
      // Stacking piles each binding's own series into one column, so overlaid datasets stand as
      // side-by-side stacks rather than collapsing together; lines never join a stack.
      ...(config.stacked ? { stack: s.result.bindingId ?? 'total' } : {}),
      itemStyle: { color: s.color },
      data: s.result.values.map((v) => {
        const border = v !== null ? outline(v) : null;
        return border ? { value: v, itemStyle: OutlineSeverity.itemStyle(s.color, border) } : v;
      }),
    };
  }

  /** A line series over the categories, honouring the chart's smooth/points/area and the binding's marker/dash. */
  private static lineSeries(
    s: ComboSeries,
    base: object,
    config: ComboChartWidgetConfig,
  ): LineSeriesOption {
    // A per-binding marker wins over the chart's "show points" default; 'none' hides markers but
    // keeps the line. A per-binding dash overrides the solid default.
    const symbol = s.symbol;
    return {
      ...base,
      type: 'line',
      smooth: config.smooth,
      itemStyle: { color: s.color },
      showSymbol: symbol ? symbol !== 'none' : config.showPoints,
      symbol: symbol && symbol !== 'none' ? symbol : 'circle',
      symbolSize: config.pointSize,
      lineStyle: {
        color: s.color,
        ...(s.dashStyle && s.dashStyle !== 'solid' ? { type: s.dashStyle } : {}),
      },
      ...(config.areaFill ? { areaStyle: { opacity: 0.15, color: s.color } } : {}),
      // Bridge categories this series has no rows in, rather than breaking the line there.
      ...(config.connectNulls ? { connectNulls: true } : {}),
      data: s.result.values,
    };
  }

  /**
   * One echarts value axis per configured Y axis. A secondary axis is offset so scales don't
   * overlap and, when it carries a single series, drawn in that series' colour so a reader can
   * tell which scale it reads against; gridlines ride the primary only.
   */
  private static valueAxes(input: {
    config: ComboChartWidgetConfig;
    series: ComboSeries[];
    indicesByAxis: Map<number, number[]>;
    seriesColors: string[];
    primaryValueLabel: string;
    valueConfig: NumericColumnConfig | undefined;
    showGridLines: boolean;
  }): YAXisComponentOption[] {
    const axes = readChartAxes(input.config);
    const multiAxis = axes.length > 1;
    const sideOrder: Record<'left' | 'right', number> = { left: 0, right: 0 };

    return axes.map((axis, k): YAXisComponentOption => {
      const isPrimary = k === 0;
      const orderOnSide = sideOrder[axis.side]++;
      const onAxis = input.indicesByAxis.get(k) ?? [];
      const axisColor = multiAxis && onAxis.length === 1 ? input.seriesColors[onAxis[0]] : null;
      const scale = ChartScale.numericAxis(
        axis.logScale,
        axis.min,
        axis.max,
        axis.interval,
        isPrimary ? input.valueConfig : undefined,
        axis.scale,
      );
      const rotate = ChartScale.labelRotate(axis.rotate);
      const longest = ComboOption.valueLabelLen(
        onAxis.map((i) => input.series[i]),
        isPrimary ? input.valueConfig : undefined,
      );
      return {
        ...scale,
        ...(rotate !== 0 ? { axisLabel: { ...scale.axisLabel, rotate } } : {}),
        name: isPrimary ? input.primaryValueLabel : axis.label.trim(),
        nameLocation: 'middle',
        nameGap: ChartScale.nameGap(longest, rotate, 'y'),
        ...(axisColor ? { nameTextStyle: { color: axisColor } } : {}),
        position: axis.side,
        ...(orderOnSide > 0 ? { offset: orderOnSide * PointChartConstants.AXIS_OFFSET } : {}),
        ...(!isPrimary || axisColor
          ? { axisLine: { show: true, ...(axisColor ? { lineStyle: { color: axisColor } } : {}) } }
          : {}),
        splitLine: { show: isPrimary && input.showGridLines },
      };
    });
  }

  /** The longest formatted value label across the given series, to size a non-overlapping name gap. */
  private static valueLabelLen(
    series: ComboSeries[],
    config: NumericColumnConfig | undefined,
  ): number {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (const v of s.result.values) {
        if (typeof v === 'number') {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (!Number.isFinite(min)) return 0;
    return Math.max(
      ChartFormat.numeric(min, config).length,
      ChartFormat.numeric(max, config).length,
    );
  }
}

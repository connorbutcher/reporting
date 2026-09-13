import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import {
  Aggregate,
  ChartSymbol,
  ComboChartWidgetConfig,
  LineDashStyle,
  chartAxisIndex,
  readChartAxes,
  readChartBindings,
} from '../../../../../core/models/report';
import { BarChartQueryResult, BarSeriesResult, ResolvedToleranceBand } from '../../../../../core/models/widget-query';
import {
  BarSeriesOption,
  ECOption,
  LabelCallbackParams,
  LineSeriesOption,
  MarkAreaData,
  MarkLineData,
  YAXisComponentOption,
} from './chart-option.types';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { AXIS_OFFSET } from './point-types';
import { SeriesColors } from './series-colors';
import { ToleranceMarks } from './tolerance-marks';
import { ToleranceOutline } from './tolerance-outline';

/** One resolved series ready to draw: its query result plus the axis, render kind, and styling it plots with. */
interface ComboSeries {
  result: BarSeriesResult;
  axisIndex: number;
  renderAs: 'bar' | 'line';
  color: string;
  /** Line marker override from the binding; null uses the default (or none per `showPoints`). */
  symbol: ChartSymbol | null;
  /** Line dash override from the binding; null draws solid. */
  dashStyle: LineDashStyle | null;
}

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
      if (s.bindingId) seriesPerBinding.set(s.bindingId, (seriesPerBinding.get(s.bindingId) ?? 0) + 1);
    }

    const series: ComboSeries[] = rawSeries.map((result, i) => {
      const binding = result.bindingId ? bindingsById.get(result.bindingId) : undefined;
      const single = (result.bindingId ? (seriesPerBinding.get(result.bindingId) ?? 1) : rawSeries.length) === 1;
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

    const valueColumn = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    const primaryValueLabel =
      axes[0].label.trim() || valueColumn?.name || ComboOption.aggregateLabel(config.aggregate);

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
    const marksBySeries = new Map<number, { marks: MarkLineData; areas: MarkAreaData }>();
    for (const [k, indices] of indicesByAxis) {
      const axisBands = bands.filter((b) => bandAxisIndex(b) === k);
      if (axisBands.length === 0) continue;
      marksBySeries.set(indices[0], {
        marks: ToleranceMarks.lines(axisBands, () => 'yAxis'),
        areas: ToleranceMarks.areas(axisBands, () => 'yAxis'),
      });
    }
    // One out-of-tolerance test per axis, shared by every series on it, for the outlined-point option.
    const outlineByAxis = new Map<number, (v: number) => string | null>();
    const outlineFor = (axisK: number): ((v: number) => string | null) => {
      let outline = outlineByAxis.get(axisK);
      if (!outline) {
        outline = ToleranceOutline.forValue(bands.filter((b) => bandAxisIndex(b) === axisK));
        outlineByAxis.set(axisK, outline);
      }
      return outline;
    };

    return {
      grid: {
        left: 56 + Math.max(0, leftCount - 1) * AXIS_OFFSET,
        right: 20 + rightCount * AXIS_OFFSET,
        top: showLegend ? 40 : 20,
        bottom: 56,
        containLabel: true,
        outerBoundsContain: 'all',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value: unknown) =>
          typeof value === 'number' ? ChartFormat.numeric(value, valueConfig) : String(value ?? ''),
      },
      ...(showLegend ? { legend: { top: 0, data: series.map((s) => s.result.label), type: 'scroll' } } : {}),
      xAxis: categoryAxis,
      yAxis: multiAxis ? yAxes : yAxes[0],
      series: series.map((s, i) => {
        const hung = marksBySeries.get(i);
        const outline = outlineFor(s.axisIndex);
        const base = {
          name: s.result.label || config.title || 'Series',
          ...(multiAxis ? { yAxisIndex: Math.min(s.axisIndex, axes.length - 1) } : {}),
          ...(config.showValueLabels
            ? {
                label: {
                  show: true,
                  position: 'top' as const,
                  formatter: (p: LabelCallbackParams) =>
                    typeof p.value === 'number' ? ChartFormat.numeric(p.value, valueConfig) : '',
                },
              }
            : {}),
          ...(hung && hung.marks.length > 0
            ? { markLine: { silent: true, symbol: 'none', data: hung.marks } }
            : {}),
          ...(hung && hung.areas.length > 0 ? { markArea: { silent: true, data: hung.areas } } : {}),
        };

        return s.renderAs === 'line'
          ? ComboOption.lineSeries(s, base, config)
          : ComboOption.barSeries(s, base, config, outline);
      }),
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
        return border ? { value: v, itemStyle: ToleranceOutline.itemStyle(s.color, border) } : v;
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
        ...(orderOnSide > 0 ? { offset: orderOnSide * AXIS_OFFSET } : {}),
        ...(!isPrimary || axisColor
          ? { axisLine: { show: true, ...(axisColor ? { lineStyle: { color: axisColor } } : {}) } }
          : {}),
        splitLine: { show: isPrimary && input.showGridLines },
      };
    });
  }

  /** The longest formatted value label across the given series, to size a non-overlapping name gap. */
  private static valueLabelLen(series: ComboSeries[], config: NumericColumnConfig | undefined): number {
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
    return Math.max(ChartFormat.numeric(min, config).length, ChartFormat.numeric(max, config).length);
  }

  private static aggregateLabel(aggregate: Aggregate): string {
    switch (aggregate) {
      case 'sum':
        return 'Sum';
      case 'average':
        return 'Average';
      case 'count':
        return 'Count';
      case 'min':
        return 'Min';
      case 'max':
        return 'Max';
    }
  }
}

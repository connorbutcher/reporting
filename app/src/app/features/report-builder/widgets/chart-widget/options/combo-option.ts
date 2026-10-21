import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import {
  ComboChartWidgetConfig,
  chartAxisIndex,
  readChartAxes,
  readChartBindings,
} from '../../../../../core/models/report';
import { BarChartQueryResult } from '../../../../../core/models/widget-query';
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
 * Combination chart: the bar chart's data, with each series drawn as bars or a line and
 * optionally on its own value axis.
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

    // Render kind, axis and colour are read live from each series' binding, so edits re-render
    // without a refetch.
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

    // A count has no measure, so it never borrows a value column's format.
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
    const seriesConfigs = new Map(
      rawSeries.map((s) => [
        s,
        isCount ? undefined : (BarOption.seriesNumericConfig(s, columns) ?? valueConfig),
      ]),
    );
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    const primaryValueLabel =
      axes[0].label.trim() || BarOption.measureLabel(config.aggregate, valueColumn?.name ?? null);

    const showLegend = series.length > 1 && config.showLegend;
    const showGridLines = config.showGridLines ?? true;

    // Tilt long category lists unless the user picked an orientation.
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

    // Combo bands sit on a value axis; the category axis is never numeric.
    const bands = (data?.toleranceBands ?? []).filter((b) => b.axis === 'y');
    const bandYAxisId = new Map(config.toleranceBands.map((b) => [b.id, b.yAxisId ?? null]));
    const bandAxis = new Map(
      bands.map((b) => [b, chartAxisIndex(axes, bandYAxisId.get(b.id) ?? null)]),
    );
    const guideLines = (config.guideLines ?? []).filter((l) => l.axis === 'y');
    const guideLineAxis = new Map(
      guideLines.map((l) => [l, chartAxisIndex(axes, l.yAxisId ?? null)]),
    );

    // Reference lines ride a carrier series per axis, so hiding a data series keeps them.
    const referenceSeries: LineSeriesOption[] = [];
    const outlineByAxis = new Map<number, (v: number) => string | null>();
    for (const k of axes.keys()) {
      const axisBands = bands.filter((b) => bandAxis.get(b) === k);
      const axisLines = guideLines.filter((l) => guideLineAxis.get(l) === k);
      outlineByAxis.set(
        k,
        OutlineSeverity.forValue([
          ...ToleranceOutline.zonesFor(axisBands),
          ...GuideLineOutline.zonesFor(axisLines),
        ]),
      );
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
    const seriesByName = new Map(rawSeries.map((s) => [BarOption.seriesName(s, config.title), s]));
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
        formatter: (raw: unknown) => BarOption.tooltip(raw, seriesByName, seriesConfigs, false),
      },
      ...(showLegend
        ? {
            legend: {
              top: 0,
              data: series.map((s) => BarOption.seriesName(s.result, config.title)),
              type: 'scroll',
            },
          }
        : {}),
      ...(zoom ? { dataZoom: CategoryZoom.dataZoom(false) } : {}),
      xAxis: categoryAxis,
      yAxis: multiAxis ? yAxes : yAxes[0],
      series: [
        ...series.map((s) => {
          const outline = outlineByAxis.get(s.axisIndex) ?? OutlineSeverity.forValue([]);
          const numericConfig = seriesConfigs.get(s.result);
          const base = {
            name: BarOption.seriesName(s.result, config.title),
            ...(multiAxis ? { yAxisIndex: Math.min(s.axisIndex, axes.length - 1) } : {}),
            ...(config.showValueLabels
              ? {
                  label: {
                    show: true,
                    position: 'top' as const,
                    formatter: (p: LabelCallbackParams) =>
                      typeof p.value === 'number'
                        ? ChartFormat.numeric(p.value, numericConfig)
                        : '',
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

  private static barSeries(
    s: ComboSeries,
    base: object,
    config: ComboChartWidgetConfig,
    outline: (v: number) => string | null,
  ): BarSeriesOption {
    return {
      ...base,
      type: 'bar',
      // Stack per binding, so overlaid datasets stand side by side; lines never stack.
      ...(config.stacked ? { stack: s.result.bindingId ?? 'total' } : {}),
      itemStyle: { color: s.color },
      data: s.result.values.map((v) => {
        const border = v !== null ? outline(v) : null;
        return border ? { value: v, itemStyle: OutlineSeverity.itemStyle(s.color, border) } : v;
      }),
    };
  }

  private static lineSeries(
    s: ComboSeries,
    base: object,
    config: ComboChartWidgetConfig,
  ): LineSeriesOption {
    // A binding's marker overrides the chart's "show points"; 'none' hides markers only.
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
      ...(config.connectNulls ? { connectNulls: true } : {}),
      data: s.result.values,
    };
  }

  /**
   * One value axis per configured Y axis. Secondary axes are offset and, with a single series,
   * drawn in its colour; gridlines ride the primary only.
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

  /** The longest formatted value label, to size the value axis name gap. */
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

import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import {
  Aggregate,
  BarChartWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../core/models/report';
import { BarChartQueryResult, BarSeriesResult } from '../../../../../core/models/widget-query';
import { BarSeriesOption, ECOption, LabelCallbackParams } from './chart-option.types';
import { CategoryZoom } from './category-zoom';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { GuideLineMarks } from './guide-line-marks';
import { GuideLineOutline } from './guide-line-outline';
import { OutlineSeverity } from './outline-zone';
import { ReferenceSeries } from './reference-series';
import { SeriesColors } from './series-colors';
import { ToleranceMarks } from './tolerance-marks';
import { ToleranceOutline } from './tolerance-outline';
import { TooltipHtml } from './tooltip-html';

/** Builds the bar echarts option: a category axis with one aggregated value per category, per series. */
export class BarOption {
  /** The name prefix of the hidden series that carry stack-total labels. */
  public static readonly TOTAL_PREFIX = '\u200btotal:';

  /** Null until there's a dataset and a category column bound. */
  public static build(
    config: BarChartWidgetConfig,
    data: BarChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    // The first bound binding names the shared category axis (its dataset's columns are `columns`),
    // matching how the widget host picks the schema; later bindings overlay their own bars.
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!categoryColumn) return null;

    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    // Each series carries the binding it came from: its colour override applies only when the
    // binding contributes a single series, and stacking piles a binding's own series together.
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const seriesPerBinding = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId)
        seriesPerBinding.set(s.bindingId, (seriesPerBinding.get(s.bindingId) ?? 0) + 1);
    }

    // A count has no measure, so it never borrows a leftover value column's units; otherwise each
    // series reads through its own measure's format, and the axis through the shared one (if any).
    const isCount = config.aggregate === 'count';
    const measureIds = isCount
      ? []
      : [
          ...new Set(
            series
              .map((s) => s.valueColumnId ?? primary?.yColumnId ?? null)
              .filter((id) => id != null),
          ),
        ];
    const valueColumn = measureIds.length === 1 ? ChartColumns.byId(columns, measureIds[0]) : null;
    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const seriesConfig = (s: BarSeriesResult): NumericColumnConfig | undefined =>
      isCount
        ? undefined
        : (ChartFormat.numericConfig(ChartColumns.byId(columns, s.valueColumnId ?? null)) ??
          valueConfig);
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    // A bar chart uses only the primary value axis; its label, interval, and rotation live there.
    const valueAxisConfig = readChartAxes(config)[0];
    const percent = !!config.percentStacked;
    const valueLabel =
      valueAxisConfig.label.trim() ||
      (percent
        ? '% of total'
        : BarOption.measureLabel(config.aggregate, valueColumn?.name ?? null));

    // A legend only earns its space once bars split into more than one series.
    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;
    const showGridLines = config.showGridLines ?? true;
    const stacked = config.stacked || percent;
    const stackOf = (s: BarSeriesResult) => s.bindingId ?? 'total';

    // 100% stacked: each bar becomes its share of its stack's total in that category.
    const stackTotals = new Map<string, number[]>();
    if (stacked) {
      for (const s of series) {
        const totals = stackTotals.get(stackOf(s)) ?? categories.map(() => 0);
        s.values.forEach((v, c) => (totals[c] += v ?? 0));
        stackTotals.set(stackOf(s), totals);
      }
    }
    const plotted = (s: BarSeriesResult): (number | null)[] =>
      percent
        ? s.values.map((v, c) => {
            const total = stackTotals.get(stackOf(s))?.[c] ?? 0;
            return v === null || total === 0 ? null : (v / total) * 100;
          })
        : s.values;
    const formatPercent = (v: number) =>
      `${ChartFormat.numeric(v, { kind: 'numeric', decimals: 1 })}%`;
    const formatValue = (s: BarSeriesResult) => (v: number) =>
      percent ? formatPercent(v) : ChartFormat.numeric(v, seriesConfig(s));

    // The value axis is whichever one isn't holding the categories, so reference lines and
    // fills land on the measure regardless of orientation. Percent bars aren't on the measure's
    // scale, so reference lines don't apply to them.
    const valueAxisKey = () => (horizontal ? 'xAxis' : 'yAxis');
    const bands = percent ? [] : (data?.toleranceBands ?? []);
    const guideLines = percent ? [] : (config.guideLines ?? []);
    const marks = [
      ...ToleranceMarks.lines(bands, valueAxisKey),
      ...GuideLineMarks.lines(guideLines, valueAxisKey),
    ];
    const areas = [
      ...ToleranceMarks.areas(bands, valueAxisKey),
      ...GuideLineMarks.areas(guideLines, valueAxisKey),
    ];
    // A bar's bands and outlined guide lines both test against the one value axis, worst-wins.
    const outlineColor = OutlineSeverity.forValue([
      ...ToleranceOutline.zonesFor(bands),
      ...GuideLineOutline.zonesFor(guideLines),
    ]);

    // Categories sit on the X axis for vertical bars, the Y axis for horizontal ones; the value
    // axis takes whichever is left. Each name's gap is sized for its labels *on that axis*.
    const categoryOrientation = horizontal ? 'y' : 'x';
    const valueOrientation = horizontal ? 'x' : 'y';

    // Long vertical-bar category lists overlap, so auto-tilt them once there are a few — unless
    // the user has picked an explicit orientation, which always wins.
    const categoryAutoRotate = !horizontal && categories.length > 6 ? 30 : 0;
    const categoryRotate = ChartScale.labelRotate(config.xAxisRotate, categoryAutoRotate);
    const categoryScale = ChartScale.categoryAxis(categories, config.xAxisInterval);
    const categoryAxis = {
      ...categoryScale,
      name: categoryLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(
        ChartScale.longestLen(categories),
        categoryRotate,
        categoryOrientation,
      ),
      axisLabel: { ...categoryScale.axisLabel, rotate: categoryRotate },
      // echarts puts the first category at the bottom of a vertical axis; read top-down instead,
      // so a sorted horizontal chart leads with its first category.
      ...(horizontal ? { inverse: true } : {}),
    };
    const valueScale = percent
      ? {
          type: 'value' as const,
          max: 100,
          axisLabel: { formatter: (v: number | string) => `${v}%` },
        }
      : ChartScale.numericAxis(
          false,
          null,
          null,
          valueAxisConfig.interval,
          valueConfig,
          valueAxisConfig.scale,
        );
    const valueRotate = ChartScale.labelRotate(valueAxisConfig.rotate);
    const valueLen = percent ? 4 : BarOption.valueLabelLen(series, valueConfig);
    const valueAxis = {
      ...valueScale,
      ...(valueRotate !== 0 ? { axisLabel: { ...valueScale.axisLabel, rotate: valueRotate } } : {}),
      name: valueLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(valueLen, valueRotate, valueOrientation),
      // Gridlines run across the value axis (the measure); the category axis never draws them.
      splitLine: { show: showGridLines },
    };

    const colorOf = (s: BarSeriesResult, i: number): string => {
      // A binding's colour override applies only when it yields a single series; once it splits
      // (several measures or a colour-by column) each series keeps its own palette colour.
      const binding = s.bindingId ? bindingsById.get(s.bindingId) : undefined;
      const single = (s.bindingId ? (seriesPerBinding.get(s.bindingId) ?? 1) : series.length) === 1;
      const override = single ? (binding?.color ?? null) : null;
      return override ?? SeriesColors.forSeries(colors, s.label, i);
    };
    const seriesName = (s: BarSeriesResult) => s.label || config.title || 'Series';

    const dataSeries = series.map((s, i): BarSeriesOption => {
      const color = colorOf(s, i);
      const format = formatValue(s);
      return {
        name: seriesName(s),
        type: 'bar',
        // Stacking piles each binding's own series into one column, so several overlaid
        // datasets stand as side-by-side stacks rather than all collapsing into one.
        ...(stacked ? { stack: stackOf(s) } : {}),
        itemStyle: { color },
        ...(config.showValueLabels
          ? {
              label: {
                show: true,
                // Stacked segments label inside, so neighbouring segments' labels don't collide.
                position: stacked ? 'inside' : horizontal ? 'right' : 'top',
                formatter: (p: LabelCallbackParams) =>
                  typeof p.value === 'number' ? format(p.value) : '',
              },
            }
          : {}),
        // A bar outside an outlined band is bordered in the crossed limit's colour.
        data: plotted(s).map((v) => {
          const border = v !== null ? outlineColor(v) : null;
          return border ? { value: v, itemStyle: OutlineSeverity.itemStyle(color, border) } : v;
        }),
      };
    });

    // A stack total rides an invisible zero-height bar on top of each stack, labelled with the total.
    const totalSeries: BarSeriesOption[] =
      config.showStackTotals && stacked && !percent
        ? [...stackTotals].map(([stack, totals]) => ({
            name: `${BarOption.TOTAL_PREFIX}${stack}`,
            type: 'bar',
            stack,
            silent: true,
            tooltip: { show: false },
            itemStyle: { color: 'transparent' },
            label: {
              show: true,
              position: horizontal ? 'right' : 'top',
              fontWeight: 'bold',
              formatter: (p: LabelCallbackParams) => {
                const total = totals[p.dataIndex];
                return total ? ChartFormat.numeric(total, valueConfig) : '';
              },
            },
            data: totals.map(() => 0),
          }))
        : [];

    const reference = ReferenceSeries.build(marks, areas);
    const zoom = CategoryZoom.enabled(config.zoom, categories.length);
    const seriesByName = new Map(series.map((s) => [seriesName(s), s]));

    return {
      grid: {
        left: 56,
        right: zoom && horizontal ? 40 : 20,
        top: showLegend ? 40 : 20,
        bottom: zoom && !horizontal ? 76 : 56,
        containLabel: true,
        outerBoundsContain: 'all',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendToBody: true,
        confine: true,
        formatter: (raw: unknown) => BarOption.tooltip(raw, seriesByName, formatValue, percent),
      },
      ...(showLegend ? { legend: { top: 0, data: series.map(seriesName), type: 'scroll' } } : {}),
      ...(zoom ? { dataZoom: CategoryZoom.dataZoom(horizontal) } : {}),
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: [...dataSeries, ...totalSeries, ...(reference ? [reference] : [])],
    };
  }

  /**
   * The axis tooltip: the category, then each series' value (with the raw value behind a percentage),
   * the rows behind the bar, and any tooltip columns. Hand-built, so everything user-supplied is escaped.
   */
  public static tooltip(
    raw: unknown,
    seriesByName: Map<string, BarSeriesResult>,
    formatValue: (s: BarSeriesResult) => (v: number) => string,
    percent: boolean,
  ): string {
    const params = (Array.isArray(raw) ? raw : [raw]) as {
      seriesName?: string;
      dataIndex: number;
      value: unknown;
      color?: unknown;
      axisValueLabel?: string;
    }[];
    const lines: string[] = [];
    const header = params[0]?.axisValueLabel;
    if (header != null) lines.push(`<strong>${TooltipHtml.escape(header)}</strong>`);
    for (const p of params) {
      const s = p.seriesName != null ? seriesByName.get(p.seriesName) : undefined;
      const value =
        typeof p.value === 'number' ? p.value : (p.value as { value?: unknown } | null)?.value;
      if (!s || typeof value !== 'number') continue;
      const format = formatValue(s);
      const actual = s.values[p.dataIndex];
      const shown =
        percent && actual != null
          ? `${format(value)} (${ChartFormat.numeric(actual)})`
          : format(value);
      const color = typeof p.color === 'string' ? p.color : '';
      lines.push(
        `${color ? TooltipHtml.marker(color) : ''}${TooltipHtml.escape(p.seriesName ?? '')}: <strong>${TooltipHtml.escape(shown)}</strong>`,
      );
      const rows = s.rowCounts?.[p.dataIndex];
      if (rows != null)
        lines.push(
          `&nbsp;&nbsp;&nbsp;${TooltipHtml.escape(`${ChartFormat.numeric(rows)} ${rows === 1 ? 'row' : 'rows'}`)}`,
        );
      for (const line of s.tooltipLines?.[p.dataIndex] ?? [])
        lines.push(`&nbsp;&nbsp;&nbsp;${TooltipHtml.escape(line)}`);
    }
    return lines.join('<br/>');
  }

  /** The value axis name: "Count of rows", or the aggregate of the measure ("Sum of Price"). */
  public static measureLabel(aggregate: Aggregate, measure: string | null): string {
    if (aggregate === 'count') return 'Count of rows';
    const name = BarOption.aggregateLabel(aggregate);
    return measure ? `${name} of ${measure}` : name;
  }

  /**
   * The longest formatted value label, in characters, from the bars' data extent (min & max) —
   * enough to size a non-overlapping {@link ChartScale.nameGap} for the value axis.
   */
  private static valueLabelLen(
    series: readonly { values: readonly (number | null)[] }[],
    config: NumericColumnConfig | undefined,
  ): number {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (const v of s.values) {
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

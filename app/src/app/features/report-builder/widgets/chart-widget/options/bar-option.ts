import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import {
  Aggregate,
  BarChartWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../core/models/report';
import { BarChartQueryResult, BarSeriesResult } from '../../../../../core/models/widget-query';
import type { BarSeriesOption } from 'echarts/charts';
import { ECOption } from './types/ec-option';
import { LabelCallbackParams } from './types/label-callback-params';
import { CategoryZoom } from './category-zoom';
import { AxisKey } from './types/axis-key';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { GuideLineMarks } from './guide-line-marks';
import { GuideLineOutline } from './guide-line-outline';
import { OutlineSeverity } from './outline-severity';
import { ReferenceSeries } from './reference-series';
import { SeriesColors } from './series-colors';
import { ToleranceMarks } from './tolerance-marks';
import { ToleranceOutline } from './tolerance-outline';
import { TooltipHtml } from './tooltip-html';

/** Bar chart: one aggregated value per category, per series. */
export class BarOption {
  /** Name prefix of the hidden series that carry stack-total labels. */
  public static readonly TOTAL_PREFIX = '\u200btotal:';

  /** Null until there's a dataset and a category column bound. */
  public static build(
    config: BarChartWidgetConfig,
    data: BarChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    // The first bound binding names the category axis; later bindings overlay their own bars.
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!categoryColumn) return null;

    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const seriesPerBinding = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId)
        seriesPerBinding.set(s.bindingId, (seriesPerBinding.get(s.bindingId) ?? 0) + 1);
    }

    // A count has no measure, so it never borrows a value column's format.
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
    const seriesConfigs = new Map(
      series.map((s) => [
        s,
        isCount ? undefined : (BarOption.seriesNumericConfig(s, columns) ?? valueConfig),
      ]),
    );
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    const valueAxisConfig = readChartAxes(config)[0];
    const percent = !!config.percentStacked;
    const valueLabel =
      valueAxisConfig.label.trim() ||
      (percent
        ? '% of total'
        : BarOption.measureLabel(config.aggregate, valueColumn?.name ?? null));

    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;
    const showGridLines = config.showGridLines ?? true;
    const stacked = config.stacked || percent;

    // 100% stacked: each bar becomes its share of its stack's category total.
    const stackTotals = new Map<string, number[]>();
    if (stacked) {
      for (const s of series) {
        const stack = BarOption.stackOf(s);
        const totals = stackTotals.get(stack) ?? categories.map(() => 0);
        s.values.forEach((v, c) => (totals[c] += v ?? 0));
        stackTotals.set(stack, totals);
      }
    }

    // Percent bars aren't on the measure's scale, so reference lines don't apply to them.
    const valueAxisKey: AxisKey = horizontal ? 'xAxis' : 'yAxis';
    const bands = percent ? [] : (data?.toleranceBands ?? []);
    const guideLines = percent ? [] : (config.guideLines ?? []);
    const marks = [
      ...ToleranceMarks.lines(bands, () => valueAxisKey),
      ...GuideLineMarks.lines(guideLines, () => valueAxisKey),
    ];
    const areas = [
      ...ToleranceMarks.areas(bands, () => valueAxisKey),
      ...GuideLineMarks.areas(guideLines, () => valueAxisKey),
    ];
    const outlineColor = OutlineSeverity.forValue([
      ...ToleranceOutline.zonesFor(bands),
      ...GuideLineOutline.zonesFor(guideLines),
    ]);

    const categoryOrientation = horizontal ? 'y' : 'x';
    const valueOrientation = horizontal ? 'x' : 'y';

    // Tilt long vertical category lists unless the user picked an orientation.
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
      // echarts draws the first category at the bottom; read top-down instead.
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
      splitLine: { show: showGridLines },
    };

    const dataSeries = series.map((s, i): BarSeriesOption => {
      // A binding's colour override applies only while it yields a single series.
      const binding = s.bindingId ? bindingsById.get(s.bindingId) : undefined;
      const single = (s.bindingId ? (seriesPerBinding.get(s.bindingId) ?? 1) : series.length) === 1;
      const override = single ? (binding?.color ?? null) : null;
      const color = override ?? SeriesColors.forSeries(colors, s.label, i);
      const numericConfig = seriesConfigs.get(s);
      return {
        name: BarOption.seriesName(s, config.title),
        type: 'bar',
        // Stack per binding, so overlaid datasets stand as side-by-side stacks.
        ...(stacked ? { stack: BarOption.stackOf(s) } : {}),
        itemStyle: { color },
        ...(config.showValueLabels
          ? {
              label: {
                show: true,
                position: stacked ? 'inside' : horizontal ? 'right' : 'top',
                formatter: (p: LabelCallbackParams) =>
                  typeof p.value === 'number'
                    ? BarOption.formatValue(p.value, percent, numericConfig)
                    : '',
              },
            }
          : {}),
        data: BarOption.plotted(s, percent, stackTotals).map((v) => {
          const border = v !== null ? outlineColor(v) : null;
          return border ? { value: v, itemStyle: OutlineSeverity.itemStyle(color, border) } : v;
        }),
      };
    });

    // Stack totals ride an invisible zero-height bar on top of each stack.
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
    const seriesByName = new Map(series.map((s) => [BarOption.seriesName(s, config.title), s]));

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
        formatter: (raw: unknown) => BarOption.tooltip(raw, seriesByName, seriesConfigs, percent),
      },
      ...(showLegend
        ? {
            legend: {
              top: 0,
              data: series.map((s) => BarOption.seriesName(s, config.title)),
              type: 'scroll',
            },
          }
        : {}),
      ...(zoom ? { dataZoom: CategoryZoom.dataZoom(horizontal) } : {}),
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: [...dataSeries, ...totalSeries, ...(reference ? [reference] : [])],
    };
  }

  /** The axis tooltip, hand-built so user-supplied text is escaped. */
  public static tooltip(
    raw: unknown,
    seriesByName: Map<string, BarSeriesResult>,
    seriesConfigs: Map<BarSeriesResult, NumericColumnConfig | undefined>,
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
      const formatted = BarOption.formatValue(value, percent, seriesConfigs.get(s));
      const actual = s.values[p.dataIndex];
      const shown =
        percent && actual != null ? `${formatted} (${ChartFormat.numeric(actual)})` : formatted;
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

  /** "Count of rows", or the aggregate of the measure ("Sum of Price"). */
  public static measureLabel(aggregate: Aggregate, measure: string | null): string {
    if (aggregate === 'count') return 'Count of rows';
    const name = BarOption.aggregateLabel(aggregate);
    return measure ? `${name} of ${measure}` : name;
  }

  public static seriesNumericConfig(
    s: BarSeriesResult,
    columns: DatasetColumn[],
  ): NumericColumnConfig | undefined {
    return ChartFormat.numericConfig(ChartColumns.byId(columns, s.valueColumnId ?? null));
  }

  public static formatValue(
    value: number,
    percent: boolean,
    config: NumericColumnConfig | undefined,
  ): string {
    return percent
      ? `${ChartFormat.numeric(value, { kind: 'numeric', decimals: 1 })}%`
      : ChartFormat.numeric(value, config);
  }

  public static seriesName(s: BarSeriesResult, chartTitle: string): string {
    return s.label || chartTitle || 'Series';
  }

  private static stackOf(s: BarSeriesResult): string {
    return s.bindingId ?? 'total';
  }

  /** Raw values, or each as a share of its stack's category total when 100% stacked. */
  private static plotted(
    s: BarSeriesResult,
    percent: boolean,
    stackTotals: Map<string, number[]>,
  ): (number | null)[] {
    if (!percent) return s.values;
    const totals = stackTotals.get(BarOption.stackOf(s));
    return s.values.map((v, c) => {
      const total = totals?.[c] ?? 0;
      return v === null || total === 0 ? null : (v / total) * 100;
    });
  }

  /** The longest formatted value label, to size the value axis name gap. */
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

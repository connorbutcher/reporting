import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import { readChartAxes, readChartBindings, XBarRChartWidgetConfig } from '../../../../../core/models/report';
import { XBarRChartQueryResult, XBarRSubgroup } from '../../../../../core/models/widget-query';
import { ECOption, LineSeriesOption, TooltipCallbackParams } from './chart-option.types';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { GuideLineMarks } from './guide-line-marks';
import { ToleranceMarks } from './tolerance-marks';

// In-control points/line stay blue; a point breaching its own control limits turns red — the same
// alarm colour tolerance bands use for an out-of-spec value, since both mean "something's wrong
// with this one". The limit lines themselves are violet, kept deliberately clear of red/amber so
// they never read as a spec band when a tolerance band is overlaid on the same X-bar axis.
const IN_CONTROL_COLOR = '#2563eb';
const OUT_OF_CONTROL_COLOR = '#dc2626';
const CENTER_LINE_COLOR = '#475569';
const LIMIT_LINE_COLOR = '#7c3aed';

/** What the subgroup tooltip needs beyond its value: which chart it's on and how to format it. */
interface SubgroupTooltipContext {
  kind: 'mean' | 'range';
  categories: readonly string[];
  subgroups: readonly XBarRSubgroup[];
  config: NumericColumnConfig | undefined;
  centerLine: number;
}

/**
 * Builds the Xbar-R echarts option: two stacked grids sharing one category (subgroup) axis — the
 * X-bar (mean) chart on top, the R (range) chart below — each with its own centre line and
 * control-limit lines. Limits are drawn as step-line series rather than a single markLine because
 * they can differ per subgroup when subgroup sizes aren't all equal.
 */
export class XBarROption {
  /** Null until there's a dataset and both a subgroup and a value column bound. */
  public static build(
    config: XBarRChartWidgetConfig,
    data: XBarRChartQueryResult | null,
    columns: DatasetColumn[],
  ): ECOption | null {
    const primary = readChartBindings(config)[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const valueColumn = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    if (!categoryColumn || !valueColumn) return null;

    const categories = data?.categories ?? [];
    const subgroups = data?.subgroups ?? [];
    const highlight = config.highlightOutOfControl ?? true;
    const xBarCenterLine = data?.xBarCenterLine ?? 0;
    const rCenterLine = data?.rCenterLine ?? 0;

    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    // An Xbar-R chart uses only the primary value axis, like a box plot — its label/bounds apply
    // to the X-bar (mean) chart; the R chart's axis is always auto-scaled from zero.
    const meanAxisConfig = readChartAxes(config)[0];
    const meanLabel = meanAxisConfig.label.trim() || valueColumn.name;

    const showGridLines = config.showGridLines ?? true;

    const categoryAutoRotate = categories.length > 6 ? 30 : 0;
    const categoryRotate = ChartScale.labelRotate(config.xAxisRotate, categoryAutoRotate);
    const categoryNameGap = ChartScale.nameGap(ChartScale.longestLen(categories), categoryRotate, 'x');
    const hiddenCategoryAxis = { ...ChartScale.categoryAxis(categories, config.xAxisInterval), gridIndex: 0 };
    const labelledCategoryAxis = {
      ...ChartScale.categoryAxis(categories, config.xAxisInterval),
      ...(categoryRotate !== 0 ? { axisLabel: { rotate: categoryRotate } } : {}),
      gridIndex: 1,
      name: categoryLabel,
      nameLocation: 'middle' as const,
      nameGap: categoryNameGap,
    };

    // The mean axis fits the data rather than anchoring at zero — a control chart's measurements
    // are rarely near it — while the range axis, never negative, keeps the usual zero floor.
    const meanScale = ChartScale.numericAxis(false, meanAxisConfig.min, meanAxisConfig.max, meanAxisConfig.interval, valueConfig, true);
    const rangeScale = ChartScale.numericAxis(false, null, null, null, valueConfig, false);

    const meanExtentValues = subgroups.flatMap((s) => [s.mean, s.xBarUcl, s.xBarLcl]);
    const rangeExtentValues = subgroups.flatMap((s) => [s.range, s.rUcl]);
    const meanNameGap = ChartScale.nameGap(XBarROption.labelLen(meanExtentValues, valueConfig), 0, 'y');
    const rangeNameGap = ChartScale.nameGap(XBarROption.labelLen(rangeExtentValues, valueConfig), 0, 'y');

    const meanAxis = {
      ...meanScale,
      gridIndex: 0,
      name: meanLabel,
      nameLocation: 'middle' as const,
      nameGap: meanNameGap,
      splitLine: { show: showGridLines },
    };
    const rangeAxis = {
      ...rangeScale,
      gridIndex: 1,
      name: 'Range',
      nameLocation: 'middle' as const,
      nameGap: rangeNameGap,
      splitLine: { show: showGridLines },
    };

    // Spec limits (a tolerance band), when set, overlay the X-bar chart only — a control chart's R
    // side has no spec of its own to compare against.
    const bands = data?.toleranceBands ?? [];
    const specMarks = [
      ...ToleranceMarks.lines(bands, () => 'yAxis'),
      ...GuideLineMarks.lines(config.guideLines ?? [], () => 'yAxis'),
    ];
    const specAreas = ToleranceMarks.areas(bands, () => 'yAxis');

    const meanTooltip: SubgroupTooltipContext = {
      kind: 'mean',
      categories,
      subgroups,
      config: valueConfig,
      centerLine: xBarCenterLine,
    };
    const rangeTooltip: SubgroupTooltipContext = {
      kind: 'range',
      categories,
      subgroups,
      config: valueConfig,
      centerLine: rCenterLine,
    };

    const meanSeries: LineSeriesOption = {
      name: 'Mean',
      type: 'line',
      xAxisIndex: 0,
      yAxisIndex: 0,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: IN_CONTROL_COLOR, width: 1.5 },
      itemStyle: { color: IN_CONTROL_COLOR },
      data: subgroups.map((s) => ({
        value: s.mean,
        ...(highlight && s.meanOutOfControl ? { itemStyle: { color: OUT_OF_CONTROL_COLOR } } : {}),
      })),
      tooltip: { formatter: (p) => XBarROption.tooltip(p, meanTooltip) },
      ...(specMarks.length > 0 ? { markLine: { silent: true, symbol: 'none', data: specMarks } } : {}),
      ...(specAreas.length > 0 ? { markArea: { silent: true, data: specAreas } } : {}),
    };

    const rangeSeries: LineSeriesOption = {
      name: 'Range',
      type: 'line',
      xAxisIndex: 1,
      yAxisIndex: 1,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: IN_CONTROL_COLOR, width: 1.5 },
      itemStyle: { color: IN_CONTROL_COLOR },
      data: subgroups.map((s) => ({
        value: s.range,
        ...(highlight && s.rangeOutOfControl ? { itemStyle: { color: OUT_OF_CONTROL_COLOR } } : {}),
      })),
      tooltip: { formatter: (p) => XBarROption.tooltip(p, rangeTooltip) },
    };

    return {
      grid: [
        { left: 56, right: 20, top: 30, height: '36%', containLabel: true },
        { left: 56, right: 20, top: '60%', bottom: 56, containLabel: true },
      ],
      xAxis: [hiddenCategoryAxis, labelledCategoryAxis],
      yAxis: [meanAxis, rangeAxis],
      tooltip: { trigger: 'item' },
      series: [
        meanSeries,
        ...XBarROption.limitSeries('X̄', categories.length, subgroups, 'xBarUcl', 0, 0),
        ...XBarROption.limitSeries('X̄', categories.length, subgroups, 'xBarLcl', 0, 0),
        XBarROption.centerSeries('X̄', categories.length, xBarCenterLine, 0, 0),
        rangeSeries,
        ...XBarROption.limitSeries('R', categories.length, subgroups, 'rUcl', 1, 1),
        ...XBarROption.limitSeries('R', categories.length, subgroups, 'rLcl', 1, 1),
        XBarROption.centerSeries('R', categories.length, rCenterLine, 1, 1),
      ],
    };
  }

  /** One point's tooltip: its mean/range plus that subgroup's own control limits and sample size. */
  private static tooltip(params: TooltipCallbackParams, ctx: SubgroupTooltipContext): string {
    const param = Array.isArray(params) ? params[0] : params;
    const i = param.dataIndex;
    const s = ctx.subgroups[i];
    if (!s) return '';
    const num = (v: number) => ChartFormat.numeric(v, ctx.config);

    const isMean = ctx.kind === 'mean';
    const value = isMean ? s.mean : s.range;
    const ucl = isMean ? s.xBarUcl : s.rUcl;
    const lcl = isMean ? s.xBarLcl : s.rLcl;
    const outOfControl = isMean ? s.meanOutOfControl : s.rangeOutOfControl;
    const valueLabel = isMean ? 'Mean' : 'Range';

    const lines = [
      `<strong>${ctx.categories[i] ?? ''}</strong>`,
      `${valueLabel}: ${num(value)}`,
      `UCL: ${num(ucl)}`,
      `CL: ${num(ctx.centerLine)}`,
      `LCL: ${num(lcl)}`,
      `n = ${s.count}`,
    ];
    if (outOfControl) lines.push('<strong style="color:#dc2626">Out of control</strong>');
    return lines.join('<br/>');
  }

  /** A flat (or stepped, when subgroup sizes differ) reference line for one control limit. */
  private static limitSeries(
    chartName: string,
    categoryCount: number,
    subgroups: readonly XBarRSubgroup[],
    field: 'xBarUcl' | 'xBarLcl' | 'rUcl' | 'rLcl',
    xAxisIndex: number,
    yAxisIndex: number,
  ): LineSeriesOption[] {
    if (categoryCount === 0) return [];
    const label = field.endsWith('Ucl') ? 'UCL' : 'LCL';
    return [
      {
        name: `${chartName} ${label}`,
        type: 'line',
        xAxisIndex,
        yAxisIndex,
        step: 'middle',
        symbol: 'none',
        silent: true,
        tooltip: { show: false },
        lineStyle: { color: LIMIT_LINE_COLOR, type: 'dashed', width: 1.25 },
        endLabel: { show: true, formatter: label, color: LIMIT_LINE_COLOR, fontSize: 10 },
        data: subgroups.map((s) => s[field]),
      },
    ];
  }

  /** The flat centre line — always one constant value across every subgroup. */
  private static centerSeries(
    chartName: string,
    categoryCount: number,
    value: number,
    xAxisIndex: number,
    yAxisIndex: number,
  ): LineSeriesOption {
    return {
      name: `${chartName} CL`,
      type: 'line',
      xAxisIndex,
      yAxisIndex,
      symbol: 'none',
      silent: true,
      tooltip: { show: false },
      lineStyle: { color: CENTER_LINE_COLOR, width: 1.25 },
      endLabel: { show: true, formatter: 'CL', color: CENTER_LINE_COLOR, fontSize: 10 },
      data: new Array(categoryCount).fill(value),
    };
  }

  /** The longest formatted value label, in characters, across a set of plotted values. */
  private static labelLen(values: readonly number[], config: NumericColumnConfig | undefined): number {
    if (values.length === 0) return 0;
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return Math.max(ChartFormat.numeric(min, config).length, ChartFormat.numeric(max, config).length);
  }
}

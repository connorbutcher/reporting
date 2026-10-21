import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import {
  ControlChartMode,
  readChartAxes,
  readChartBindings,
  XBarRChartWidgetConfig,
} from '../../../../../core/models/report';
import { XBarRChartQueryResult, XBarRSubgroup } from '../../../../../core/models/widget-query';
import { ECOption, LineSeriesOption, TooltipCallbackParams } from './chart-option.types';
import { CategoryZoom } from './category-zoom';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { GuideLineMarks } from './guide-line-marks';
import { ReferenceSeries } from './reference-series';
import { ToleranceMarks } from './tolerance-marks';
import { TooltipHtml } from './tooltip-html';

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
  /** The plotted value's name on this chart (Mean, Value, Range, Std dev, Moving range). */
  valueLabel: string;
  categories: readonly string[];
  subgroups: readonly XBarRSubgroup[];
  /** How this chart's values and limits read: the measure's format, or a percentage on a p chart. */
  format: (value: number) => string;
  centerLine: number;
}

/**
 * Builds the Xbar-R echarts option: two stacked grids sharing one category (subgroup) axis — the
 * X-bar (mean) chart on top, the R (range) chart below — each with its own centre line and
 * control-limit lines. Limits are drawn as step-line series rather than a single markLine because
 * they can differ per subgroup when subgroup sizes aren't all equal.
 */
export class XBarROption {
  /** An out-of-control point: red and a larger triangle, so its status isn't carried by colour alone. */
  private static readonly OUT_OF_CONTROL_POINT = {
    symbol: 'triangle',
    symbolSize: 11,
    itemStyle: { color: OUT_OF_CONTROL_COLOR },
  };

  /** What each Nelson rule means, for the tooltip. */
  private static readonly RULES: Record<number, string> = {
    1: 'beyond a control limit',
    2: '9 in a row on one side of the centre line',
    3: '6 in a row steadily rising or falling',
    4: '14 in a row alternating up and down',
    5: '2 of 3 beyond 2σ on one side',
  };

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
    const mode = data?.mode ?? config.mode ?? 'xBarR';
    const names = XBarROption.names(mode);
    const xBarCenterLine = data?.xBarCenterLine ?? 0;
    const rCenterLine = data?.rCenterLine ?? 0;

    // An attribute chart (p, np) plots a defective share or count on one chart, not a measure and
    // its spread on two: no second grid, and its values don't take the measure column's units.
    const attribute = mode === 'p' || mode === 'np';
    const valueConfig = attribute ? undefined : ChartFormat.numericConfig(valueColumn);
    const formatMean =
      mode === 'p'
        ? (v: number) => `${ChartFormat.numeric(v * 100, { kind: 'numeric', decimals: 1 })}%`
        : (v: number) => ChartFormat.numeric(v, valueConfig);
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    // An Xbar-R chart uses only the primary value axis, like a box plot — its label/bounds apply
    // to the X-bar (mean) chart; the R chart's axis is always auto-scaled from zero.
    const meanAxisConfig = readChartAxes(config)[0];
    const meanLabel = meanAxisConfig.label.trim() || (attribute ? names.value : valueColumn.name);

    const showGridLines = config.showGridLines ?? true;

    const categoryAutoRotate = categories.length > 6 ? 30 : 0;
    const categoryRotate = ChartScale.labelRotate(config.xAxisRotate, categoryAutoRotate);
    const categoryNameGap = ChartScale.nameGap(
      ChartScale.longestLen(categories),
      categoryRotate,
      'x',
    );
    const hiddenCategoryAxis = {
      ...ChartScale.categoryAxis(categories, config.xAxisInterval),
      gridIndex: 0,
    };
    const labelledCategoryAxis = {
      ...ChartScale.categoryAxis(categories, config.xAxisInterval),
      ...(categoryRotate !== 0 ? { axisLabel: { rotate: categoryRotate } } : {}),
      gridIndex: attribute ? 0 : 1,
      name: categoryLabel,
      nameLocation: 'middle' as const,
      nameGap: categoryNameGap,
    };

    // The mean axis fits the data rather than anchoring at zero — a control chart's measurements
    // are rarely near it — while the range axis, never negative, keeps the usual zero floor.
    const meanScale = ChartScale.numericAxis(
      false,
      meanAxisConfig.min,
      meanAxisConfig.max,
      meanAxisConfig.interval,
      valueConfig,
      true,
    );
    const rangeScale = ChartScale.numericAxis(false, null, null, null, valueConfig, false);

    const meanExtentValues = subgroups.flatMap((s) => [s.mean, s.xBarUcl, s.xBarLcl]);
    const rangeExtentValues = subgroups.flatMap((s) =>
      s.hasRange === false ? [s.rUcl] : [s.range, s.rUcl],
    );
    const meanNameGap = ChartScale.nameGap(
      mode === 'p' ? 6 : XBarROption.labelLen(meanExtentValues, valueConfig),
      0,
      'y',
    );
    const rangeNameGap = ChartScale.nameGap(
      XBarROption.labelLen(rangeExtentValues, valueConfig),
      0,
      'y',
    );

    const meanAxis = {
      ...meanScale,
      ...(mode === 'p'
        ? { axisLabel: { formatter: (v: number | string) => formatMean(Number(v)) } }
        : {}),
      gridIndex: 0,
      name: meanLabel,
      nameLocation: 'middle' as const,
      nameGap: meanNameGap,
      splitLine: { show: showGridLines },
    };
    const rangeAxis = {
      ...rangeScale,
      gridIndex: 1,
      name: names.dispersion,
      nameLocation: 'middle' as const,
      nameGap: rangeNameGap,
      splitLine: { show: showGridLines },
    };

    // Spec limits (a tolerance band), when set, overlay the X-bar chart only — a control chart's R
    // side has no spec of its own to compare against. Only value-axis guide lines apply: the
    // subgroup axis has no numeric scale to place an X line on.
    const bands = (data?.toleranceBands ?? []).filter((b) => b.axis === 'y');
    const guideLines = (config.guideLines ?? []).filter((l) => l.axis === 'y');
    // Limits held from a baseline: a dotted marker after the last baseline subgroup says so.
    const baselineCount = data?.baselineCount ?? null;
    const baselineMark =
      baselineCount != null && baselineCount > 0 && baselineCount < categories.length
        ? [
            {
              xAxis: baselineCount - 1,
              lineStyle: { color: CENTER_LINE_COLOR, type: 'dotted' as const, width: 1.25 },
              label: {
                formatter: 'Limits baseline',
                position: 'insideEndTop' as const,
                color: CENTER_LINE_COLOR,
                fontSize: 10,
              },
            },
          ]
        : [];
    const specReference = ReferenceSeries.build(
      [
        ...ToleranceMarks.lines(bands, () => 'yAxis'),
        ...GuideLineMarks.lines(guideLines, () => 'yAxis'),
        ...baselineMark,
      ],
      [
        ...ToleranceMarks.areas(bands, () => 'yAxis'),
        ...GuideLineMarks.areas(guideLines, () => 'yAxis'),
      ],
      { xAxisIndex: 0, yAxisIndex: 0 },
    );

    const meanTooltip: SubgroupTooltipContext = {
      kind: 'mean',
      valueLabel: names.value,
      categories,
      subgroups,
      format: formatMean,
      centerLine: xBarCenterLine,
    };
    const rangeTooltip: SubgroupTooltipContext = {
      kind: 'range',
      valueLabel: names.dispersion,
      categories,
      subgroups,
      format: (v: number) => ChartFormat.numeric(v, valueConfig),
      centerLine: rCenterLine,
    };

    const meanSeries: LineSeriesOption = {
      name: names.value,
      type: 'line',
      xAxisIndex: 0,
      yAxisIndex: 0,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: IN_CONTROL_COLOR, width: 1.5 },
      itemStyle: { color: IN_CONTROL_COLOR },
      data: subgroups.map((s) => ({
        value: s.mean,
        ...(highlight && s.meanOutOfControl ? XBarROption.OUT_OF_CONTROL_POINT : {}),
      })),
      tooltip: { formatter: (p) => XBarROption.tooltip(p, meanTooltip) },
    };

    const rangeSeries: LineSeriesOption = {
      name: names.dispersion,
      type: 'line',
      xAxisIndex: 1,
      yAxisIndex: 1,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: IN_CONTROL_COLOR, width: 1.5 },
      itemStyle: { color: IN_CONTROL_COLOR },
      // A subgroup of one (or the first individual) has no range: leave a gap rather than plot 0.
      data: subgroups.map((s) => ({
        value: s.hasRange === false ? null : s.range,
        ...(highlight && s.rangeOutOfControl ? XBarROption.OUT_OF_CONTROL_POINT : {}),
      })),
      tooltip: { formatter: (p) => XBarROption.tooltip(p, rangeTooltip) },
    };

    // Many subgroups get a slider that pans both charts together.
    const zoom = CategoryZoom.enabled(config.zoom, categories.length);

    const meanSeriesSet = [
      meanSeries,
      ...XBarROption.limitSeries(names.meanChart, categories.length, subgroups, 'xBarUcl', 0, 0),
      ...XBarROption.limitSeries(names.meanChart, categories.length, subgroups, 'xBarLcl', 0, 0),
      XBarROption.centerSeries(names.meanChart, categories.length, xBarCenterLine, 0, 0),
    ];

    if (attribute) {
      return {
        grid: { left: 56, right: 20, top: 30, bottom: zoom ? 76 : 56, containLabel: true },
        xAxis: labelledCategoryAxis,
        yAxis: meanAxis,
        tooltip: { trigger: 'item', appendToBody: true, confine: true },
        ...(zoom ? { dataZoom: CategoryZoom.dataZoom(false) } : {}),
        series: [...meanSeriesSet, ...(specReference ? [specReference] : [])],
      };
    }

    return {
      grid: [
        { left: 56, right: 20, top: 30, height: '36%', containLabel: true },
        { left: 56, right: 20, top: '60%', bottom: zoom ? 76 : 56, containLabel: true },
      ],
      xAxis: [hiddenCategoryAxis, labelledCategoryAxis],
      yAxis: [meanAxis, rangeAxis],
      tooltip: { trigger: 'item', appendToBody: true, confine: true },
      ...(zoom
        ? {
            dataZoom: [
              { type: 'inside' as const, xAxisIndex: [0, 1] },
              { type: 'slider' as const, xAxisIndex: [0, 1], height: 20, bottom: 12 },
            ],
          }
        : {}),
      series: [
        ...meanSeriesSet,
        rangeSeries,
        ...XBarROption.limitSeries(
          names.dispersionChart,
          categories.length,
          subgroups,
          'rUcl',
          1,
          1,
        ),
        ...XBarROption.limitSeries(
          names.dispersionChart,
          categories.length,
          subgroups,
          'rLcl',
          1,
          1,
        ),
        XBarROption.centerSeries(names.dispersionChart, categories.length, rCenterLine, 1, 1),
        ...(specReference ? [specReference] : []),
      ],
    };
  }

  /** What each chart and its plotted value are called in a control chart mode. */
  public static names(mode: ControlChartMode): {
    value: string;
    dispersion: string;
    meanChart: string;
    dispersionChart: string;
  } {
    switch (mode) {
      case 'xBarS':
        return { value: 'Mean', dispersion: 'Std dev', meanChart: 'X̄', dispersionChart: 'S' };
      case 'individuals':
        return {
          value: 'Value',
          dispersion: 'Moving range',
          meanChart: 'X',
          dispersionChart: 'MR',
        };
      case 'p':
        return {
          value: 'Proportion defective',
          dispersion: '',
          meanChart: 'p',
          dispersionChart: '',
        };
      case 'np':
        return { value: 'Defectives', dispersion: '', meanChart: 'np', dispersionChart: '' };
      default:
        return { value: 'Mean', dispersion: 'Range', meanChart: 'X̄', dispersionChart: 'R' };
    }
  }

  /** One point's tooltip: its mean/range plus that subgroup's own control limits and sample size. */
  private static tooltip(params: TooltipCallbackParams, ctx: SubgroupTooltipContext): string {
    const param = Array.isArray(params) ? params[0] : params;
    const i = param.dataIndex;
    const s = ctx.subgroups[i];
    if (!s) return '';
    const num = ctx.format;

    const isMean = ctx.kind === 'mean';
    const value = isMean ? s.mean : s.range;
    const ucl = isMean ? s.xBarUcl : s.rUcl;
    const lcl = isMean ? s.xBarLcl : s.rLcl;
    const outOfControl = isMean ? s.meanOutOfControl : s.rangeOutOfControl;
    const rules = (isMean ? s.meanRules : s.rangeRules) ?? [];
    if (!isMean && s.hasRange === false) return '';

    const lines = [
      `<strong>${TooltipHtml.escape(ctx.categories[i] ?? '')}</strong>`,
      `${ctx.valueLabel}: ${num(value)}`,
      `UCL: ${num(ucl)}`,
      `CL: ${num(ctx.centerLine)}`,
      `LCL: ${num(lcl)}`,
      `n = ${s.count}`,
    ];
    if (outOfControl) {
      lines.push('<strong style="color:#dc2626">Out of control</strong>');
      for (const rule of rules) lines.push(`Rule ${rule}: ${XBarROption.RULES[rule] ?? ''}`);
    }
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
  private static labelLen(
    values: readonly number[],
    config: NumericColumnConfig | undefined,
  ): number {
    if (values.length === 0) return 0;
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return Math.max(
      ChartFormat.numeric(min, config).length,
      ChartFormat.numeric(max, config).length,
    );
  }
}

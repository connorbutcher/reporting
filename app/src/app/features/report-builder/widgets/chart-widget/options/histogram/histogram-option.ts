import { DatasetColumn, NumericColumnConfig } from '../../../../../../core/models/dataset';
import {
  ChartGuideLine,
  HistogramNormalize,
  HistogramWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import {
  HistogramQueryResult,
  ResolvedToleranceBand,
} from '../../../../../../core/models/widget-query';
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import { ECOption } from '../types/ec-option';
import { LabelCallbackParams } from '../types/label-callback-params';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { ChartScale } from '../axes/chart-scale';
import { GuideLineMarks } from '../marks/guide-line-marks';
import { ReferenceSeries } from '../marks/reference-series';
import { TooltipHtml } from '../format/tooltip-html';
import { SeriesColors } from '../colors/series-colors';
import { ToleranceMarks } from '../marks/tolerance-marks';

/**
 * Histogram: one bar per value bin, per series. Spec bands are mapped onto the bin axis's
 * fractional category positions.
 */
export class HistogramOption {
  /** Null until there's a dataset and a value column bound. */
  public static build(
    config: HistogramWidgetConfig,
    data: HistogramQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const valueColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!valueColumn) return null;

    const bins = data?.bins ?? [];
    const series = data?.series ?? [];
    const binLabels = HistogramOption.binLabels(bins, ChartFormat.numericConfig(valueColumn));

    const binAxisLabel = config.xAxisLabel.trim() || valueColumn.name;
    const countAxisConfig = readChartAxes(config)[0];
    const countLabel =
      countAxisConfig.label.trim() || HistogramOption.normalizeLabel(config.normalize);

    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;
    const showGridLines = config.showGridLines ?? true;

    const binAxisKey: 'xAxis' | 'yAxis' = horizontal ? 'yAxis' : 'xAxis';
    const binOrientation = horizontal ? 'y' : 'x';
    const countOrientation = horizontal ? 'x' : 'y';

    const bands = HistogramOption.bandsOnBinAxis(data?.toleranceBands ?? [], bins);
    const guideLines = HistogramOption.linesOnBinAxis(config.guideLines ?? [], bins);
    const marks = [
      ...ToleranceMarks.lines(bands, () => binAxisKey),
      ...GuideLineMarks.lines(guideLines, () => binAxisKey),
    ];
    const areas = [
      ...ToleranceMarks.areas(bands, () => binAxisKey),
      ...GuideLineMarks.areas(guideLines, () => binAxisKey),
    ];

    const binRotate = ChartScale.labelRotate(
      config.xAxisRotate,
      !horizontal && bins.length > 6 ? 30 : 0,
    );
    const binScale = ChartScale.categoryAxis(binLabels, config.xAxisInterval);
    const binAxis = {
      ...binScale,
      name: binAxisLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(ChartScale.longestLen(binLabels), binRotate, binOrientation),
      axisLabel: { ...binScale.axisLabel, rotate: binRotate },
      // Read a horizontal histogram top-down, lowest bin first.
      ...(horizontal ? { inverse: true } : {}),
    };

    const countScale = ChartScale.numericAxis(
      false,
      null,
      null,
      countAxisConfig.interval,
      undefined,
      countAxisConfig.scale,
    );
    const countRotate = ChartScale.labelRotate(countAxisConfig.rotate);
    const countLen = HistogramOption.countLabelLen(series, config.normalize);
    const countAxis = {
      ...countScale,
      axisLabel: {
        ...countScale.axisLabel,
        formatter: (value: number | string) =>
          typeof value === 'number'
            ? HistogramOption.formatCount(value, config.normalize)
            : String(value),
        ...(countRotate !== 0 ? { rotate: countRotate } : {}),
      },
      name: countLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(countLen, countRotate, countOrientation),
      splitLine: { show: showGridLines },
    };

    const reference = ReferenceSeries.build(marks, areas);
    const names = series.map((s) => s.label || config.title || 'Series');
    // A colour override applies only to a single, unsplit distribution.
    const override = series.length === 1 ? (primary?.color ?? null) : null;
    const seriesColors = series.map(
      (s, i) => override ?? SeriesColors.forSeries(colors, s.label, i),
    );

    // A fitted normal curve per distribution; a cumulative chart has none.
    const curves: LineSeriesOption[] =
      config.showNormalCurve && !config.cumulative
        ? series.flatMap((s, i) => {
            const values = HistogramOption.normalCurve(s, bins, config.normalize);
            return values
              ? [
                  {
                    name: names[i],
                    id: `normal:${i}`,
                    type: 'line' as const,
                    smooth: true,
                    symbol: 'none',
                    silent: true,
                    tooltip: { show: false },
                    lineStyle: { color: seriesColors[i], width: 2, type: 'dashed' as const },
                    itemStyle: { color: seriesColors[i] },
                    z: 3,
                    data: values,
                  },
                ]
              : [];
          })
        : [];

    return {
      grid: {
        left: 56,
        right: 20,
        top: showLegend ? 40 : 20,
        bottom: 56,
        containLabel: true,
        outerBoundsContain: 'all',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendToBody: true,
        confine: true,
        formatter: (raw: unknown) => {
          const params = (Array.isArray(raw) ? raw : [raw]) as {
            seriesName?: string;
            seriesId?: string;
            dataIndex: number;
            value: unknown;
            color?: unknown;
          }[];
          const index = params[0]?.dataIndex ?? -1;
          const lines = [`<strong>${TooltipHtml.escape(binLabels[index] ?? '')}</strong>`];
          for (const p of params) {
            const i = names.indexOf(p.seriesName ?? '');
            if (i < 0 || typeof p.value !== 'number' || p.seriesId?.startsWith('normal:')) continue;
            const color = typeof p.color === 'string' ? TooltipHtml.marker(p.color) : '';
            lines.push(
              `${color}${TooltipHtml.escape(names[i])}: <strong>${HistogramOption.formatCount(p.value, config.normalize)}</strong>`,
            );
            for (const line of series[i].tooltipLines?.[p.dataIndex] ?? []) {
              lines.push(`&nbsp;&nbsp;&nbsp;${TooltipHtml.escape(line)}`);
            }
          }
          return lines.join('<br/>');
        },
      },
      ...(showLegend ? { legend: { top: 0, data: names, type: 'scroll' } } : {}),
      xAxis: horizontal ? countAxis : binAxis,
      yAxis: horizontal ? binAxis : countAxis,
      series: [
        ...series.map((s, i): BarSeriesOption | LineSeriesOption => {
          const color = seriesColors[i];

          const label = config.showValueLabels
            ? {
                label: {
                  show: true,
                  position: (horizontal ? 'right' : 'top') as 'right' | 'top',
                  formatter: (p: LabelCallbackParams) =>
                    typeof p.value === 'number'
                      ? HistogramOption.formatCount(p.value, config.normalize)
                      : '',
                },
              }
            : {};

          // Cumulative draws as a step line; plain bins butt together to read as continuous.
          if (config.cumulative) {
            return {
              name: names[i],
              type: 'line',
              step: 'end',
              symbol: 'none',
              lineStyle: { color, width: 2 },
              itemStyle: { color },
              areaStyle: series.length === 1 ? { color, opacity: 0.12 } : undefined,
              data: s.values,
              ...label,
            };
          }

          return {
            name: names[i],
            type: 'bar',
            barCategoryGap: series.length > 1 ? '20%' : '0%',
            itemStyle: { color },
            data: s.values,
            ...label,
          };
        }),
        ...curves,
        ...(reference ? [reference] : []),
      ],
    };
  }

  /**
   * A normal curve per bin centre on the histogram's scale: count = n·w·pdf, frequency = w·pdf,
   * density = pdf. Null without stats, spread or bin width.
   */
  public static normalCurve(
    series: { mean?: number; stdDev?: number; count?: number },
    bins: HistogramQueryResult['bins'],
    normalize: HistogramNormalize,
  ): number[] | null {
    const { mean, stdDev, count } = series;
    if (mean == null || stdDev == null || !(stdDev > 0) || bins.length === 0) return null;
    const width = bins[0].upper - bins[0].lower;
    if (!(width > 0)) return null;
    const scale =
      normalize === 'density' ? 1 : normalize === 'frequency' ? width : (count ?? 0) * width;
    return bins.map((bin) => {
      const z = ((bin.lower + bin.upper) / 2 - mean) / stdDev;
      return (scale * Math.exp(-0.5 * z * z)) / (stdDev * Math.sqrt(2 * Math.PI));
    });
  }

  /**
   * Maps X-axis spec bands onto the bin category axis: v sits at (v − firstLower) / binWidth − 0.5.
   * Count-axis bands, and all bands when the bins are degenerate, are dropped.
   */
  private static bandsOnBinAxis(
    bands: readonly ResolvedToleranceBand[],
    bins: HistogramQueryResult['bins'],
  ): ResolvedToleranceBand[] {
    if (bins.length === 0) return [];
    const firstLower = bins[0].lower;
    const binWidth = bins[0].upper - bins[0].lower;
    if (!(binWidth > 0)) return [];

    return bands
      .filter((band) => band.axis === 'x')
      .map((band) => ({
        ...band,
        min: HistogramOption.toBinIndex(band.min, firstLower, binWidth),
        max: HistogramOption.toBinIndex(band.max, firstLower, binWidth),
        concessionLower: HistogramOption.toBinIndex(band.concessionLower, firstLower, binWidth),
        concessionUpper: HistogramOption.toBinIndex(band.concessionUpper, firstLower, binWidth),
      }));
  }

  /** {@link bandsOnBinAxis} for guide lines. */
  private static linesOnBinAxis(
    lines: readonly ChartGuideLine[],
    bins: HistogramQueryResult['bins'],
  ): ChartGuideLine[] {
    if (bins.length === 0) return [];
    const firstLower = bins[0].lower;
    const binWidth = bins[0].upper - bins[0].lower;
    if (!(binWidth > 0)) return [];

    return lines
      .filter((line) => line.axis === 'x')
      .map((line) => ({
        ...line,
        value: HistogramOption.toBinIndex(line.value, firstLower, binWidth),
        valueTo:
          line.valueTo === null || line.valueTo === undefined
            ? line.valueTo
            : HistogramOption.toBinIndex(line.valueTo, firstLower, binWidth),
      }));
  }

  private static toBinIndex(value: number, firstLower: number, binWidth: number): number;
  private static toBinIndex(
    value: number | null,
    firstLower: number,
    binWidth: number,
  ): number | null;
  private static toBinIndex(
    value: number | null,
    firstLower: number,
    binWidth: number,
  ): number | null {
    return value === null ? null : (value - firstLower) / binWidth - 0.5;
  }

  /** Bin labels formatted like the column, falling back to the server's when both edges match. */
  private static binLabels(
    bins: HistogramQueryResult['bins'],
    config: NumericColumnConfig | undefined,
  ): string[] {
    return bins.map((bin) => {
      const lower = ChartFormat.numeric(bin.lower, config);
      const upper = ChartFormat.numeric(bin.upper, config);
      return lower === upper ? bin.label : `${lower} – ${upper}`;
    });
  }

  /** The longest formatted count label, to size the count axis name gap. */
  private static countLabelLen(
    series: readonly { values: readonly number[] }[],
    normalize: HistogramNormalize,
  ): number {
    let max = -Infinity;
    for (const s of series) for (const v of s.values) if (v > max) max = v;
    if (!Number.isFinite(max)) return 0;
    return HistogramOption.formatCount(max, normalize).length;
  }

  private static formatCount(value: number, normalize: HistogramNormalize): string {
    if (normalize === 'frequency') {
      return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    }
    if (normalize === 'density') {
      return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
    return ChartFormat.numeric(value, undefined);
  }

  private static normalizeLabel(normalize: HistogramNormalize): string {
    switch (normalize) {
      case 'frequency':
        return 'Frequency';
      case 'density':
        return 'Density';
      default:
        return 'Count';
    }
  }
}

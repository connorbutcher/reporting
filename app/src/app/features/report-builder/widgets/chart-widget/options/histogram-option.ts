import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import {
  ChartGuideLine,
  HistogramNormalize,
  HistogramWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../core/models/report';
import { HistogramQueryResult, ResolvedToleranceBand } from '../../../../../core/models/widget-query';
import { BarSeriesOption, ECOption, LabelCallbackParams, LineSeriesOption } from './chart-option.types';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { GuideLineMarks } from './guide-line-marks';
import { ReferenceSeries } from './reference-series';
import { TooltipHtml } from './tooltip-html';
import { SeriesColors } from './series-colors';
import { ToleranceMarks } from './tolerance-marks';

/**
 * Builds the histogram echarts option: a category axis of value bins with one bar per bin
 * (per series). Spec bands sit on the binned variable, so — unlike the other charts — their
 * bounds are mapped onto the bin axis's fractional category positions before being drawn.
 */
export class HistogramOption {
  /** Null until there's a dataset and a value column bound. */
  public static build(
    config: HistogramWidgetConfig,
    data: HistogramQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    // A histogram bins one column of its primary binding; that column names the value (bin) axis.
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const valueColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!valueColumn) return null;

    const bins = data?.bins ?? [];
    const series = data?.series ?? [];
    const binLabels = HistogramOption.binLabels(bins, ChartFormat.numericConfig(valueColumn));

    const binAxisLabel = config.xAxisLabel.trim() || valueColumn.name;
    // The count/frequency axis is the primary value axis; its label falls back to what's plotted.
    const countAxisConfig = readChartAxes(config)[0];
    const countLabel = countAxisConfig.label.trim() || HistogramOption.normalizeLabel(config.normalize);

    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;
    const showGridLines = config.showGridLines ?? true;

    // The bins sit on the X axis for vertical bars, the Y axis for horizontal ones; the count axis
    // takes whichever is left. Spec bands bind to the bin axis (the binned variable).
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

    const binRotate = ChartScale.labelRotate(config.xAxisRotate, !horizontal && bins.length > 6 ? 30 : 0);
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
        // Count / frequency (%) / density share one formatter across the axis, tooltip, and labels.
        formatter: (value: number | string) =>
          typeof value === 'number' ? HistogramOption.formatCount(value, config.normalize) : String(value),
        ...(countRotate !== 0 ? { rotate: countRotate } : {}),
      },
      name: countLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(countLen, countRotate, countOrientation),
      splitLine: { show: showGridLines },
    };

    const reference = ReferenceSeries.build(marks, areas);
    const names = series.map((s) => s.label || config.title || 'Series');
    const colorOf = (label: string, i: number): string => {
      // A colour override applies only to a single, unsplit distribution; once a series column
      // splits it, each series keeps its own palette colour.
      const override = series.length === 1 ? (primary?.color ?? null) : null;
      return override ?? SeriesColors.forSeries(colors, label, i);
    };

    // A fitted normal curve per distribution, on the same scale as its bars: sampled at each bin's
    // centre and smoothed between them. A cumulative chart has no bell to fit.
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
                    lineStyle: { color: colorOf(s.label, i), width: 2, type: 'dashed' as const },
                    itemStyle: { color: colorOf(s.label, i) },
                    z: 3,
                    data: values,
                  },
                ]
              : [];
          })
        : [];

    return {
      grid: { left: 56, right: 20, top: showLegend ? 40 : 20, bottom: 56, containLabel: true, outerBoundsContain: 'all' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendToBody: true,
        confine: true,
        // Hand-built so each bin can carry its tooltip columns under its height; the fitted curve
        // and reference carrier have no tooltip of their own.
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
          const color = colorOf(s.label, i);

          const label = config.showValueLabels
            ? {
                label: {
                  show: true,
                  position: (horizontal ? 'right' : 'top') as 'right' | 'top',
                  formatter: (p: LabelCallbackParams) =>
                    typeof p.value === 'number' ? HistogramOption.formatCount(p.value, config.normalize) : '',
                },
              }
            : {};

          // A cumulative distribution reads as a rising step line, not a bank of bars; the plain
          // distribution stays as bars that butt together so adjacent bins read as continuous.
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
   * A normal curve fitted to one distribution (its mean and σ), as one value per bin centre on the
   * histogram's own scale: count = n·w·pdf, frequency = w·pdf, density = pdf. Null when the series
   * lacks its stats, has no spread, or the bins have no width.
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
    const scale = normalize === 'density' ? 1 : normalize === 'frequency' ? width : (count ?? 0) * width;
    return bins.map((bin) => {
      const z = ((bin.lower + bin.upper) / 2 - mean) / stdDev;
      return (scale * Math.exp(-0.5 * z * z)) / (stdDev * Math.sqrt(2 * Math.PI));
    });
  }

  /**
   * Re-expresses each spec band's bounds as positions on the bin *category* axis. A value v sits at
   * fractional category index (v − firstLower) / binWidth − 0.5, so a spec line lands where its
   * value falls across the bars rather than being snapped to a bin. Only bands on the binned
   * variable (the X axis) are mapped — a band on the count axis has no meaning across the bins, so
   * it's dropped rather than drawn in the wrong place. Bands are also dropped when the bins are
   * missing or degenerate (no width to map onto).
   */
  private static bandsOnBinAxis(
    bands: readonly ResolvedToleranceBand[],
    bins: HistogramQueryResult['bins'],
  ): ResolvedToleranceBand[] {
    if (bins.length === 0) return [];
    const firstLower = bins[0].lower;
    const binWidth = bins[0].upper - bins[0].lower;
    if (!(binWidth > 0)) return [];

    const toIndex = (v: number): number => (v - firstLower) / binWidth - 0.5;
    const at = (v: number | null): number | null => (v === null ? null : toIndex(v));

    return bands
      .filter((band) => band.axis === 'x')
      .map((band) => ({
        ...band,
        min: at(band.min),
        max: at(band.max),
        concessionLower: at(band.concessionLower),
        concessionUpper: at(band.concessionUpper),
      }));
  }

  /**
   * The {@link bandsOnBinAxis} remap, for guide lines: only lines on the binned variable (the X
   * axis) have a position across the bins, so — like a spec band — a line on the count axis is
   * dropped rather than drawn in the wrong place.
   */
  private static linesOnBinAxis(
    lines: readonly ChartGuideLine[],
    bins: HistogramQueryResult['bins'],
  ): ChartGuideLine[] {
    if (bins.length === 0) return [];
    const firstLower = bins[0].lower;
    const binWidth = bins[0].upper - bins[0].lower;
    if (!(binWidth > 0)) return [];

    const toIndex = (v: number): number => (v - firstLower) / binWidth - 0.5;

    return lines
      .filter((line) => line.axis === 'x')
      .map((line) => ({
        ...line,
        value: toIndex(line.value),
        valueTo: line.valueTo === null || line.valueTo === undefined ? line.valueTo : toIndex(line.valueTo),
      }));
  }

  /**
   * Each bin's axis label, its edges formatted like the column's cells (prefix, units, decimals).
   * Falls back to the server's label when the column's decimals would print both edges the same.
   */
  private static binLabels(bins: HistogramQueryResult['bins'], config: NumericColumnConfig | undefined): string[] {
    return bins.map((bin) => {
      const lower = ChartFormat.numeric(bin.lower, config);
      const upper = ChartFormat.numeric(bin.upper, config);
      return lower === upper ? bin.label : `${lower} – ${upper}`;
    });
  }

  /** The longest formatted count label, in characters, to size a non-overlapping count-axis gap. */
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
    // A relative frequency reads best as a percentage; a density stays a plain fraction; a raw
    // count is a whole number with grouping.
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

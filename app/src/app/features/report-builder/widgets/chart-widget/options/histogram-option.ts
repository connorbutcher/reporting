import { DatasetColumn } from '../../../../../core/models/dataset';
import {
  HistogramNormalize,
  HistogramWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../core/models/report';
import { HistogramQueryResult, ResolvedToleranceBand } from '../../../../../core/models/widget-query';
import { BarSeriesOption, ECOption, LabelCallbackParams } from './chart-option.types';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
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
    const binLabels = bins.map((b) => b.label);

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
    const marks = ToleranceMarks.lines(bands, () => binAxisKey);
    const areas = ToleranceMarks.areas(bands, () => binAxisKey);

    const binRotate = ChartScale.labelRotate(config.xAxisRotate, !horizontal && bins.length > 6 ? 30 : 0);
    const binScale = ChartScale.categoryAxis(binLabels, config.xAxisInterval);
    const binAxis = {
      ...binScale,
      name: binAxisLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(ChartScale.longestLen(binLabels), binRotate, binOrientation),
      axisLabel: { ...binScale.axisLabel, rotate: binRotate },
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
      ...(countRotate !== 0 ? { axisLabel: { ...countScale.axisLabel, rotate: countRotate } } : {}),
      name: countLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(countLen, countRotate, countOrientation),
      splitLine: { show: showGridLines },
    };

    return {
      grid: { left: 56, right: 20, top: showLegend ? 40 : 20, bottom: 56, containLabel: true, outerBoundsContain: 'all' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value: unknown) =>
          typeof value === 'number' ? HistogramOption.formatCount(value, config.normalize) : String(value ?? ''),
      },
      ...(showLegend ? { legend: { top: 0, data: series.map((s) => s.label), type: 'scroll' } } : {}),
      xAxis: horizontal ? countAxis : binAxis,
      yAxis: horizontal ? binAxis : countAxis,
      series: series.map((s, i): BarSeriesOption => {
        // A colour override applies only to a single, unsplit distribution; once a series column
        // splits it, each series keeps its own palette colour.
        const override = series.length === 1 ? (primary?.color ?? null) : null;
        const color = override ?? SeriesColors.forSeries(colors, s.label, i);
        return {
          name: s.label || config.title || 'Series',
          type: 'bar',
          // Adjacent bins read as a continuous distribution, so bars butt together with no gap.
          barCategoryGap: series.length > 1 ? '20%' : '0%',
          itemStyle: { color },
          ...(config.showValueLabels
            ? {
                label: {
                  show: true,
                  position: horizontal ? 'right' : 'top',
                  formatter: (p: LabelCallbackParams) =>
                    typeof p.value === 'number' ? HistogramOption.formatCount(p.value, config.normalize) : '',
                },
              }
            : {}),
          data: s.values,
          ...(i === 0 && marks.length > 0 ? { markLine: { silent: true, symbol: 'none', data: marks } } : {}),
          ...(i === 0 && areas.length > 0 ? { markArea: { silent: true, data: areas } } : {}),
        };
      }),
    };
  }

  /**
   * Re-expresses each spec band's bounds as positions on the bin *category* axis. A value v sits at
   * fractional category index (v − firstLower) / binWidth − 0.5, so a spec line lands where its
   * value falls across the bars rather than being snapped to a bin. Bands are dropped when the bins
   * are missing or degenerate (no width to map onto).
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

    return bands.map((band) => ({
      ...band,
      min: at(band.min),
      max: at(band.max),
      concessionLower: at(band.concessionLower),
      concessionUpper: at(band.concessionUpper),
    }));
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
    // Raw counts are whole numbers; a frequency or density is fractional, so keep a few decimals.
    return normalize === 'count'
      ? ChartFormat.numeric(value, undefined)
      : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
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

import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import { BoxPlotWidgetConfig, readChartAxes, readChartBindings } from '../../../../../core/models/report';
import { Box, BoxPlotQueryResult, ResolvedToleranceBand } from '../../../../../core/models/widget-query';
import {
  BoxplotSeriesOption,
  ECOption,
  ScatterSeriesOption,
  TooltipCallbackParams,
} from './chart-option.types';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { SeriesColors } from './series-colors';
import { ToleranceMarks } from './tolerance-marks';
import { ToleranceOutline } from './tolerance-outline';

/** What the box tooltip needs beyond the summary: the value formatting and the optional engineering extras. */
interface BoxTooltipContext {
  config: NumericColumnConfig | undefined;
  horizontal: boolean;
  showMean: boolean;
  showCapability: boolean;
  /** The single value-axis spec band (min & max resolved) capability is measured against, or null. */
  spec: ResolvedToleranceBand | null;
}

/** Builds the box-and-whisker echarts option: a category axis with one box per category, per series. */
export class BoxOption {
  /** Null until there's a dataset and both a category and a value column bound. */
  public static build(
    config: BoxPlotWidgetConfig,
    data: BoxPlotQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    // A box plot is single-binding; its one binding holds the category/value axes.
    const primary = readChartBindings(config)[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const valueColumn = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    if (!categoryColumn || !valueColumn) return null;

    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    // A box plot uses only the primary value axis; its label, interval, and rotation live there.
    const valueAxisConfig = readChartAxes(config)[0];
    const valueLabel = valueAxisConfig.label.trim() || valueColumn.name;

    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;
    const showGridLines = config.showGridLines ?? true;
    const showPoints = config.showPoints ?? false;

    // The value axis is whichever one isn't holding the categories, so reference lines and
    // fills land on the measure regardless of orientation.
    const valueAxisKey = () => (horizontal ? 'xAxis' : 'yAxis') as 'xAxis' | 'yAxis';
    const bands = data?.toleranceBands ?? [];
    const marks = ToleranceMarks.lines(bands, valueAxisKey);
    const areas = ToleranceMarks.areas(bands, valueAxisKey);
    // Boxes whose whiskers breach an outlined spec band are bordered in the crossed limit's colour.
    const outline = ToleranceOutline.forExtent(bands);

    const categoryOrientation = horizontal ? 'y' : 'x';
    const valueOrientation = horizontal ? 'x' : 'y';

    const categoryAutoRotate = !horizontal && categories.length > 6 ? 30 : 0;
    const categoryRotate = ChartScale.labelRotate(config.xAxisRotate, categoryAutoRotate);
    const categoryScale = ChartScale.categoryAxis(categories, config.xAxisInterval);
    const categoryAxis = {
      ...categoryScale,
      name: categoryLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(ChartScale.longestLen(categories), categoryRotate, categoryOrientation),
      axisLabel: { ...categoryScale.axisLabel, rotate: categoryRotate },
    };
    const valueScale = ChartScale.numericAxis(
      false,
      valueAxisConfig.min,
      valueAxisConfig.max,
      valueAxisConfig.interval,
      valueConfig,
      valueAxisConfig.scale,
    );
    const valueRotate = ChartScale.labelRotate(valueAxisConfig.rotate);
    const valueLen = BoxOption.valueLabelLen(series, valueConfig);
    const valueAxis = {
      ...valueScale,
      ...(valueRotate !== 0 ? { axisLabel: { ...valueScale.axisLabel, rotate: valueRotate } } : {}),
      name: valueLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(valueLen, valueRotate, valueOrientation),
      splitLine: { show: showGridLines },
    };

    // The resolved name and colour of each series, computed once and shared by the box series and
    // every overlay (points, mean, n) so they stay visually paired and legend-toggle together.
    const resolved = series.map((s, i) => {
      const override = series.length === 1 ? primary?.color : null;
      return {
        series: s,
        name: s.label || config.title || 'Series',
        color: override ?? SeriesColors.forSeries(colors, s.label, i),
      };
    });

    // Box, keyed by "<series name>#<categoryIndex>" so the tooltip can recover its summary from
    // an echarts callback param (the boxplot value array alone omits the mean, σ, and count).
    const boxByKey = new Map<string, Box>();
    for (const { series: s, name } of resolved) {
      s.boxes.forEach((box, i) => {
        if (box) boxByKey.set(`${name}#${i}`, box);
      });
    }

    const boxSeries = resolved.map(({ series: s, name, color }, i): BoxplotSeriesOption => ({
      name,
      type: 'boxplot',
      // One item per category so grouped series stay aligned; an all-NaN item is echarts' empty
      // value (drawn as nothing). An out-of-spec box swaps its border for the crossed limit's colour;
      // when raw points are overlaid the fill is dimmed so they read through it.
      data: s.boxes.map((box) => {
        if (!box) return { value: [NaN, NaN, NaN, NaN, NaN] };
        const border = outline(box.min, box.max);
        return {
          value: [box.min, box.q1, box.median, box.q3, box.max],
          itemStyle: {
            color,
            borderColor: border ?? color,
            borderWidth: border ? 2.5 : 1.5,
            opacity: showPoints ? 0.35 : 1,
          },
        };
      }),
      ...(i === 0 && marks.length > 0
        ? { markLine: { silent: true, symbol: 'none', data: marks } }
        : {}),
      ...(i === 0 && areas.length > 0 ? { markArea: { silent: true, data: areas } } : {}),
    }));

    const overlays: ScatterSeriesOption[] = [];
    for (const { series: s, name, color } of resolved) {
      // Jittered raw points behind the emphasis marks, so a small group's shape is visible.
      if (showPoints) {
        const points: [number, number][] = [];
        s.boxes.forEach((box, c) => {
          box?.points.forEach((v, k) => {
            const jx = c + BoxOption.jitter(c * 1009 + k);
            points.push(horizontal ? [v, jx] : [jx, v]);
          });
        });
        if (points.length > 0) {
          overlays.push({
            id: `points:${name}`,
            name,
            type: 'scatter',
            symbolSize: 4,
            itemStyle: { color, opacity: 0.5 },
            data: points,
          });
        }
      }

      // Outlier dots (Tukey/StdDev) — skipped when raw points already show every value.
      if (!showPoints && s.outliers.length > 0) {
        overlays.push({
          id: `outlier:${name}`,
          name,
          type: 'scatter',
          symbolSize: 6,
          itemStyle: { color, opacity: 0.8 },
          data: s.outliers.map((o) => (horizontal ? [o.value, o.categoryIndex] : [o.categoryIndex, o.value])),
        });
      }

      // Mean marker: a diamond alongside the median line.
      if (config.showMean) {
        const means = s.boxes.flatMap((box, c) =>
          box ? [horizontal ? [box.mean, c] : [c, box.mean]] : [],
        );
        if (means.length > 0) {
          overlays.push({
            id: `mean:${name}`,
            name,
            type: 'scatter',
            symbol: 'diamond',
            symbolSize: 11,
            itemStyle: { color, borderColor: '#fff', borderWidth: 1 },
            data: means,
          });
        }
      }

      // Sample-size (n) annotation above each box — a label-only point, no marker, no tooltip.
      if (config.showSampleSize) {
        const labels = s.boxes.flatMap((box, c) =>
          box ? [{ value: horizontal ? [box.max, c] : [c, box.max], name: `n=${box.count}` }] : [],
        );
        if (labels.length > 0) {
          overlays.push({
            id: `n:${name}`,
            name,
            type: 'scatter',
            symbolSize: 0,
            tooltip: { show: false },
            label: {
              show: true,
              position: horizontal ? 'right' : 'top',
              formatter: '{b}',
              fontSize: 10,
              color: '#64748b',
            },
            data: labels,
          });
        }
      }
    }

    const spec = BoxOption.specBand(bands);
    const tooltipContext: BoxTooltipContext = {
      config: valueConfig,
      horizontal,
      showMean: config.showMean ?? false,
      showCapability: config.showCapability ?? false,
      spec,
    };

    return {
      grid: { left: 56, right: 20, top: showLegend ? 40 : 20, bottom: 56, containLabel: true, outerBoundsContain: 'all' },
      tooltip: {
        trigger: 'item',
        formatter: (params: TooltipCallbackParams) => BoxOption.tooltip(params, boxByKey, tooltipContext),
      },
      ...(showLegend ? { legend: { top: 0, data: resolved.map((r) => r.name), type: 'scroll' } } : {}),
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      // Boxes first, then points, then the emphasis marks (outliers, mean, n) on top.
      series: [...boxSeries, ...overlays],
    };
  }

  /**
   * The item tooltip. A box shows its five-number summary and row count, plus — when enabled —
   * its mean and σ and the process capability (Cp/Cpk) against the spec band. The overlays name
   * themselves through the callback's `seriesId`, so a mean/outlier/point shows just its value.
   */
  private static tooltip(
    params: TooltipCallbackParams,
    boxByKey: Map<string, Box>,
    ctx: BoxTooltipContext,
  ): string {
    const param = Array.isArray(params) ? params[0] : params;
    const num = (value: number) => ChartFormat.numeric(value, ctx.config);

    if (param.seriesType === 'boxplot') {
      const box = boxByKey.get(`${param.seriesName}#${param.dataIndex}`);
      if (!box) return '';
      const lines = [
        `Maximum: ${num(box.max)}`,
        `Upper quartile: ${num(box.q3)}`,
        `Median: ${num(box.median)}`,
        `Lower quartile: ${num(box.q1)}`,
        `Minimum: ${num(box.min)}`,
      ];
      if (ctx.showMean || ctx.showCapability) {
        lines.push(`Mean: ${num(box.mean)}`, `Std dev: ${num(box.stdDev)}`);
      }
      const capability = ctx.showCapability ? BoxOption.capability(box, ctx.spec) : null;
      const body = lines.join('<br/>');
      return (
        `<strong>${param.seriesName || 'Box'}</strong><br/>${body}<br/>n = ${box.count}` +
        (capability ? `<br/>${capability}` : '')
      );
    }

    // An overlay point (mean/outlier/raw): its value sits on whichever axis isn't the category one.
    const value = param.value as [number, number];
    const measure = ctx.horizontal ? value[0] : value[1];
    const id = param.seriesId ?? '';
    if (id.startsWith('mean:')) return `Mean: ${num(measure)}`;
    if (id.startsWith('outlier:')) return `Outlier: ${num(measure)}`;
    return num(measure);
  }

  /**
   * Process capability against a spec band: Cp = (USL − LSL) / 6σ measures the spread against the
   * tolerance width; Cpk additionally penalises being off-centre. Null when σ is zero (a degenerate
   * box) so we never divide by it.
   */
  private static capability(box: Box, spec: ResolvedToleranceBand | null): string | null {
    if (!spec || spec.min === null || spec.max === null || box.stdDev <= 0) return null;
    const cp = (spec.max - spec.min) / (6 * box.stdDev);
    const cpk = Math.min(spec.max - box.mean, box.mean - spec.min) / (3 * box.stdDev);
    return `Cp: ${cp.toFixed(2)} · Cpk: ${cpk.toFixed(2)}`;
  }

  /** The single value-axis spec band (both bounds resolved) capability is measured against, else null. */
  private static specBand(bands: readonly ResolvedToleranceBand[]): ResolvedToleranceBand | null {
    const usable = bands.filter((b) => b.axis === 'y' && b.min !== null && b.max !== null);
    return usable.length === 1 ? usable[0] : null;
  }

  /** A stable pseudo-random horizontal offset (~±0.17 of a category width) for a jittered point. */
  private static jitter(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 0.34;
  }

  /**
   * The longest formatted value label, in characters, across every box's extent and outliers —
   * enough to size a non-overlapping {@link ChartScale.nameGap} for the value axis.
   */
  private static valueLabelLen(
    series: BoxPlotQueryResult['series'],
    config: NumericColumnConfig | undefined,
  ): number {
    let min = Infinity;
    let max = -Infinity;
    const consider = (v: number) => {
      if (v < min) min = v;
      if (v > max) max = v;
    };
    for (const s of series) {
      for (const box of s.boxes) {
        if (box) {
          consider(box.min);
          consider(box.max);
        }
      }
      for (const o of s.outliers) consider(o.value);
    }
    if (!Number.isFinite(min)) return 0;
    return Math.max(ChartFormat.numeric(min, config).length, ChartFormat.numeric(max, config).length);
  }
}

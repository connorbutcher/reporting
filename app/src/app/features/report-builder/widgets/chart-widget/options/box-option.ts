import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import {
  BoxPlotWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../core/models/report';
import {
  Box,
  BoxPlotQueryResult,
  ResolvedToleranceBand,
} from '../../../../../core/models/widget-query';
import type { BoxplotSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import { ECOption } from './types/ec-option';
import { TooltipCallbackParams } from './types/tooltip-callback-params';
import { CategoryZoom } from './category-zoom';
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
import { BoxTooltipContext } from './types/box-tooltip-context';
import { AxisKey } from './types/axis-key';

/** Box-and-whisker chart: one box per category, per series. */
export class BoxOption {
  /** Null until there's a dataset and both a category and a value column bound. */
  public static build(
    config: BoxPlotWidgetConfig,
    data: BoxPlotQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): ECOption | null {
    const primary = readChartBindings(config)[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const valueColumn = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    if (!categoryColumn || !valueColumn) return null;

    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    const valueAxisConfig = readChartAxes(config)[0];
    const valueLabel = valueAxisConfig.label.trim() || valueColumn.name;

    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;
    const showGridLines = config.showGridLines ?? true;
    const showPoints = config.showPoints ?? false;

    const valueAxisKey: AxisKey = horizontal ? 'xAxis' : 'yAxis';
    const bands = data?.toleranceBands ?? [];
    const guideLines = config.guideLines ?? [];
    const marks = [
      ...ToleranceMarks.lines(bands, () => valueAxisKey),
      ...GuideLineMarks.lines(guideLines, () => valueAxisKey),
    ];
    const areas = [
      ...ToleranceMarks.areas(bands, () => valueAxisKey),
      ...GuideLineMarks.areas(guideLines, () => valueAxisKey),
    ];
    const outline = OutlineSeverity.forExtent([
      ...ToleranceOutline.zonesFor(bands),
      ...GuideLineOutline.zonesFor(guideLines),
    ]);

    const categoryOrientation = horizontal ? 'y' : 'x';
    const valueOrientation = horizontal ? 'x' : 'y';

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

    // Shared by the box series and its overlays so they pair visually and toggle together.
    const resolved = series.map((s, i) => {
      const override = series.length === 1 ? primary?.color : null;
      return {
        series: s,
        name: s.label || config.title || 'Series',
        color: override ?? SeriesColors.forSeries(colors, s.label, i),
      };
    });

    // Keyed by "<series>#<category>" so the tooltip can recover the mean, σ and count.
    const boxByKey = new Map<string, Box>();
    for (const { series: s, name } of resolved) {
      s.boxes.forEach((box, i) => {
        if (box) boxByKey.set(`${name}#${i}`, box);
      });
    }

    const boxSeries = resolved.map(({ series: s, name, color }): BoxplotSeriesOption => ({
      name,
      type: 'boxplot',
      // An all-NaN item draws nothing but keeps grouped series aligned.
      data: s.boxes.map((box) => {
        if (!box) return { value: [NaN, NaN, NaN, NaN, NaN] };
        const border = outline(box.min, box.max);
        return {
          value: [box.min, box.q1, box.median, box.q3, box.max],
          itemStyle: {
            color,
            borderColor: border ?? color,
            borderWidth: border ? 2.5 : 1.5,
            // Dashed so the warning isn't carried by colour alone.
            ...(border ? { borderType: 'dashed' as const } : {}),
            opacity: showPoints ? 0.35 : 1,
          },
        };
      }),
    }));

    const overlays: ScatterSeriesOption[] = [];
    for (const { series: s, name, color } of resolved) {
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

      // Raw points already show every value, outliers included.
      if (!showPoints && s.outliers.length > 0) {
        overlays.push({
          id: `outlier:${name}`,
          name,
          type: 'scatter',
          symbolSize: 6,
          itemStyle: { color, opacity: 0.8 },
          data: s.outliers.map((o) =>
            horizontal ? [o.value, o.categoryIndex] : [o.categoryIndex, o.value],
          ),
        });
      }

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

    const reference = ReferenceSeries.build(marks, areas);
    const zoom = CategoryZoom.enabled(config.zoom, categories.length);

    return {
      grid: {
        left: 56,
        right: zoom && horizontal ? 40 : 20,
        top: showLegend ? 40 : 20,
        bottom: zoom && !horizontal ? 76 : 56,
        containLabel: true,
        outerBoundsContain: 'all',
      },
      ...(zoom ? { dataZoom: CategoryZoom.dataZoom(horizontal) } : {}),
      tooltip: {
        trigger: 'item',
        appendToBody: true,
        confine: true,
        formatter: (params: TooltipCallbackParams) =>
          BoxOption.tooltip(params, boxByKey, tooltipContext),
      },
      ...(showLegend
        ? { legend: { top: 0, data: resolved.map((r) => r.name), type: 'scroll' } }
        : {}),
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: [...boxSeries, ...overlays, ...(reference ? [reference] : [])],
    };
  }

  /** A box shows its summary and optional mean, σ and Pp/Ppk; an overlay shows its value. */
  private static tooltip(
    params: TooltipCallbackParams,
    boxByKey: Map<string, Box>,
    ctx: BoxTooltipContext,
  ): string {
    const param = Array.isArray(params) ? params[0] : params;

    if (param.seriesType === 'boxplot') {
      const box = boxByKey.get(`${param.seriesName}#${param.dataIndex}`);
      if (!box) return '';
      const summary: [label: string, value: number][] = [
        ['Maximum', box.max],
        ['Upper quartile', box.q3],
        ['Median', box.median],
        ['Lower quartile', box.q1],
        ['Minimum', box.min],
      ];
      if (ctx.showMean || ctx.showCapability) {
        summary.push(['Mean', box.mean], ['Std dev', box.stdDev]);
      }
      const capability = ctx.showCapability ? BoxOption.capability(box, ctx.spec) : null;
      const body = summary
        .map(([label, value]) => `${label}: ${ChartFormat.numeric(value, ctx.config)}`)
        .join('<br/>');
      return (
        `<strong>${TooltipHtml.escape(param.seriesName || 'Box')}</strong><br/>${body}<br/>n = ${box.count}` +
        (capability ? `<br/>${capability}` : '') +
        (box.tooltipLines ?? []).map((line) => `<br/>${TooltipHtml.escape(line)}`).join('')
      );
    }

    const value = param.value as [number, number];
    const measure = ctx.horizontal ? value[0] : value[1];
    const id = param.seriesId ?? '';
    const shown = ChartFormat.numeric(measure, ctx.config);
    if (id.startsWith('mean:')) return `Mean: ${shown}`;
    if (id.startsWith('outlier:')) return `Outlier: ${shown}`;
    return shown;
  }

  /**
   * Pp = (USL − LSL) / 6σ and Ppk, using the overall σ (performance, not capability).
   * Null when σ is zero.
   */
  private static capability(box: Box, spec: ResolvedToleranceBand | null): string | null {
    if (!spec || spec.min === null || spec.max === null || box.stdDev <= 0) return null;
    const pp = (spec.max - spec.min) / (6 * box.stdDev);
    const ppk = Math.min(spec.max - box.mean, box.mean - spec.min) / (3 * box.stdDev);
    return `Pp: ${pp.toFixed(2)} · Ppk: ${ppk.toFixed(2)}`;
  }

  private static specBand(bands: readonly ResolvedToleranceBand[]): ResolvedToleranceBand | null {
    const usable = bands.filter((b) => b.axis === 'y' && b.min !== null && b.max !== null);
    return usable.length === 1 ? usable[0] : null;
  }

  /** A stable pseudo-random offset of about ±0.17 of a category width. */
  private static jitter(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 0.34;
  }

  /** The longest formatted value label, to size the value axis name gap. */
  private static valueLabelLen(
    series: BoxPlotQueryResult['series'],
    config: NumericColumnConfig | undefined,
  ): number {
    const values = series.flatMap((s) => [
      ...s.boxes.flatMap((box) => (box ? [box.min, box.max] : [])),
      ...s.outliers.map((o) => o.value),
    ]);
    const min = values.reduce((low, v) => (v < low ? v : low), Infinity);
    const max = values.reduce((high, v) => (v > high ? v : high), -Infinity);
    if (!Number.isFinite(min)) return 0;
    return Math.max(
      ChartFormat.numeric(min, config).length,
      ChartFormat.numeric(max, config).length,
    );
  }
}

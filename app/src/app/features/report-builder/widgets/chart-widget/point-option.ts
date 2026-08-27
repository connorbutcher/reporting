import type { EChartsCoreOption } from 'echarts/core';
import { DatasetColumn } from '../../../../core/models/dataset';
import {
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
  readChartBindings,
} from '../../../../core/models/report';
import { ChartQueryResult, ChartSeriesResult } from '../../../../core/models/widget-query';
import {
  SERIES_COLORS,
  columnById,
  markAreaData,
  markLineData,
  outlierItemStyle,
  pointOutlineColor,
} from './chart-options-shared';

/** The two chart kinds that plot raw rows as points, as opposed to aggregated bars. */
export type PointChartConfig = ScatterChartWidgetConfig | LineChartWidgetConfig;

/** A coordinate is numeric for a value axis, a category label for a text one. */
type Coord = number | string;

interface ScatterPoint {
  value: [Coord, Coord];
  tooltipLines: string[];
  /** Per-point override, set only for points outlined as out of tolerance. */
  itemStyle?: object;
}

interface ScatterTooltipParams {
  value: [Coord, Coord];
  seriesName: string;
  data: ScatterPoint;
}

/**
 * The scatter/line option: value axes with one mark per row, grouped into
 * series. Null until there's a dataset and both axes are bound.
 */
export function buildPointOption(
  config: PointChartConfig,
  data: ChartQueryResult | null,
  columns: DatasetColumn[],
): EChartsCoreOption | null {
  // The first bound binding names the shared axes; its dataset's columns are
  // `columns` (the same binding the host loaded the schema for).
  const primary = readChartBindings(config).find((b) => b.datasetId) ?? null;
  const x = columnById(columns, primary?.xColumnId ?? null);
  const y = columnById(columns, primary?.yColumnId ?? null);
  if (!x || !y) return null;

  const series = data?.series ?? [];

  const xLabel = config.xAxisLabel.trim() || x.name;
  const yLabel = config.yAxisLabel.trim() || y.name;
  // A text column plots on a category axis; a numeric one on a value axis. The
  // category list is the distinct values the points carry, sorted to match the
  // server's alphabetical ordering.
  const xIsText = x.type === 'string';
  const yIsText = y.type === 'string';
  const xData = xIsText ? categoryValues(series, 'x') : null;
  const yData = yIsText ? categoryValues(series, 'y') : null;
  const names = series.map((s) => s.label);
  // A legend and per-series tooltip name only earn their place once there's more
  // than one series to tell apart — whether from a colour-by split within one
  // dataset or from several datasets overlaid on the chart.
  const showSeries = series.length > 1;
  const bands = data?.toleranceBands ?? [];
  const axisKeyFor = (band: { axis: 'x' | 'y' }): 'xAxis' | 'yAxis' =>
    band.axis === 'x' ? 'xAxis' : 'yAxis';
  const marks = markLineData(bands, axisKeyFor);
  const areas = markAreaData(bands, axisKeyFor);
  const outlineColor = pointOutlineColor(bands);

  return {
    grid: {
      left: 56,
      right: 20,
      top: showSeries && config.showLegend ? 40 : 20,
      bottom: 48,
      containLabel: true,
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: ScatterTooltipParams) =>
        formatTooltip(params, showSeries, xLabel, yLabel),
    },
    ...(showSeries && config.showLegend ? { legend: { top: 0, data: names } } : {}),
    xAxis: {
      type: xIsText ? 'category' : 'value',
      ...(xData ? { data: xData } : {}),
      name: xLabel,
      nameLocation: 'middle',
      nameGap: 28,
    },
    yAxis: {
      type: yIsText ? 'category' : 'value',
      ...(yData ? { data: yData } : {}),
      name: yLabel,
      nameLocation: 'middle',
      nameGap: 40,
    },
    series: series.map((s, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length];
      return {
        name: s.label || config.title || 'Series',
        ...seriesKindOptions(config, color),
        itemStyle: { color },
        data: pointsFor(s, color, outlineColor),
        // Attached to the first series only — markLine/markArea coordinates are
        // chart-wide, so one copy is enough regardless of how many series are plotted.
        ...(i === 0 && marks.length > 0
          ? { markLine: { silent: true, symbol: 'none', data: marks } }
          : {}),
        ...(i === 0 && areas.length > 0 ? { markArea: { silent: true, data: areas } } : {}),
      };
    }),
  };
}

function formatTooltip(
  params: ScatterTooltipParams,
  showSeries: boolean,
  xLabel: string,
  yLabel: string,
): string {
  const lines = [
    ...(showSeries ? [params.seriesName] : []),
    `${xLabel}: ${params.value[0]}`,
    `${yLabel}: ${params.value[1]}`,
    ...params.data.tooltipLines,
  ];

  return lines.join('<br/>');
}

function pointsFor(
  series: ChartSeriesResult,
  color: string,
  outlineColor: (x: Coord, y: Coord) => string | null,
): ScatterPoint[] {
  return series.points.map((p) => {
    const border = outlineColor(p.x, p.y);
    return {
      value: [p.x, p.y],
      tooltipLines: p.tooltipLines,
      ...(border ? { itemStyle: outlierItemStyle(color, border) } : {}),
    };
  });
}

/** The distinct category labels a text axis carries, alphabetical — the axis's `data`. */
function categoryValues(series: ChartSeriesResult[], axis: 'x' | 'y'): string[] {
  const values = new Set<string>();
  for (const s of series) {
    for (const point of s.points) values.add(String(axis === 'x' ? point.x : point.y));
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

/**
 * The echarts series options specific to one point-chart kind — the type and its
 * per-kind styling. Everything else (name, colour, data, mark lines) is shared by
 * the caller.
 */
function seriesKindOptions(config: PointChartConfig, color: string): object {
  switch (config.type) {
    case 'lineChart':
      return {
        type: 'line' as const,
        smooth: config.smooth,
        showSymbol: config.showPoints,
        symbol: config.showPoints ? 'circle' : 'none',
        symbolSize: config.pointSize,
        ...(config.areaFill ? { areaStyle: { opacity: 0.15, color } } : {}),
      };
    case 'scatterChart':
      return { type: 'scatter' as const, symbolSize: config.pointSize };
  }
}

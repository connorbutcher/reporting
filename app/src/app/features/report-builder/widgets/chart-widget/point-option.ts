import type { EChartsCoreOption } from 'echarts/core';
import { DatasetColumn } from '../../../../core/models/dataset.model';
import {
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
} from '../../../../core/models/report.model';
import { ChartQueryResult, ChartSeriesResult } from '../../../../core/models/widget-query.model';
import { SERIES_COLORS, columnById, markLineData } from './chart-options-shared';

/** The two chart kinds that plot raw rows as points, as opposed to aggregated bars. */
export type PointChartConfig = ScatterChartWidgetConfig | LineChartWidgetConfig;

interface ScatterPoint {
  value: [number, number];
  tooltipLines: string[];
}

interface ScatterTooltipParams {
  value: [number, number];
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
  const x = columnById(columns, config.xColumnId);
  const y = columnById(columns, config.yColumnId);
  if (!x || !y) return null;

  const seriesColumn = columnById(columns, config.seriesColumnId);
  const series = data?.series ?? [];

  const xLabel = config.xAxisLabel.trim() || x.name;
  const yLabel = config.yAxisLabel.trim() || y.name;
  const names = series.map((s) => s.label);
  const marks = markLineData(
    data?.toleranceBands ?? [],
    (band) => (band.axis === 'x' ? 'xAxis' : 'yAxis'),
  );

  return {
    grid: {
      left: 56,
      right: 20,
      top: seriesColumn && config.showLegend ? 40 : 20,
      bottom: 48,
      containLabel: true,
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: ScatterTooltipParams) =>
        formatTooltip(params, seriesColumn, xLabel, yLabel),
    },
    ...(seriesColumn && config.showLegend ? { legend: { top: 0, data: names } } : {}),
    xAxis: { type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 28 },
    yAxis: { type: 'value', name: yLabel, nameLocation: 'middle', nameGap: 40 },
    series: series.map((s, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length];
      return {
        name: s.label || config.title || 'Series',
        ...seriesKindOptions(config, color),
        itemStyle: { color },
        data: pointsFor(s),
        // Attached to the first series only — markLine coordinates are chart-wide,
        // so one copy is enough regardless of how many series are plotted.
        ...(i === 0 && marks.length > 0
          ? { markLine: { silent: true, symbol: 'none', data: marks } }
          : {}),
      };
    }),
  };
}

function formatTooltip(
  params: ScatterTooltipParams,
  seriesColumn: DatasetColumn | null,
  xLabel: string,
  yLabel: string,
): string {
  const lines = [
    ...(seriesColumn ? [params.seriesName] : []),
    `${xLabel}: ${params.value[0]}`,
    `${yLabel}: ${params.value[1]}`,
    ...params.data.tooltipLines,
  ];

  return lines.join('<br/>');
}

function pointsFor(series: ChartSeriesResult): ScatterPoint[] {
  return series.points.map((p) => ({ value: [p.x, p.y], tooltipLines: p.tooltipLines }));
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

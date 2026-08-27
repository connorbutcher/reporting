import type { EChartsCoreOption } from 'echarts/core';
import { DatasetColumn } from '../../../../core/models/dataset';
import {
  Aggregate,
  BarChartWidgetConfig,
  readChartBindings,
} from '../../../../core/models/report';
import { BarChartQueryResult } from '../../../../core/models/widget-query';
import {
  SERIES_COLORS,
  columnById,
  markAreaData,
  markLineData,
  outlierItemStyle,
  valueOutlineColor,
} from './chart-options-shared';

/**
 * The bar option: a category axis with one aggregated value per category, per
 * series. Null until there's a dataset and a category column bound.
 */
export function buildBarOption(
  config: BarChartWidgetConfig,
  data: BarChartQueryResult | null,
  columns: DatasetColumn[],
): EChartsCoreOption | null {
  // A bar chart is single-binding; its one binding holds the category/value axes.
  const primary = readChartBindings(config)[0];
  const categoryColumn = columnById(columns, primary?.xColumnId ?? null);
  if (!categoryColumn) return null;

  const categories = data?.categories ?? [];
  const series = data?.series ?? [];

  const valueColumn = columnById(columns, primary?.yColumnId ?? null);
  const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
  const valueLabel =
    config.yAxisLabel.trim() || valueColumn?.name || aggregateLabel(config.aggregate);

  // A legend only earns its space once bars split into more than one series.
  const showLegend = series.length > 1 && config.showLegend;
  const horizontal = config.horizontal;

  // The value axis is whichever one isn't holding the categories, so reference
  // lines and fills land on the measure regardless of orientation.
  const valueAxisKey = () => (horizontal ? 'xAxis' : 'yAxis');
  const bands = data?.toleranceBands ?? [];
  const marks = markLineData(bands, valueAxisKey);
  const areas = markAreaData(bands, valueAxisKey);
  const outlineColor = valueOutlineColor(bands);

  const categoryAxis = {
    type: 'category' as const,
    data: categories,
    name: categoryLabel,
    nameLocation: 'middle' as const,
    nameGap: horizontal ? 64 : 28,
    // Long category lists overlap horizontally, so tilt them once there are a few.
    ...(horizontal ? {} : { axisLabel: { rotate: categories.length > 6 ? 30 : 0 } }),
  };
  const valueAxis = {
    type: 'value' as const,
    name: valueLabel,
    nameLocation: 'middle' as const,
    nameGap: horizontal ? 28 : 48,
  };

  return {
    grid: { left: 56, right: 20, top: showLegend ? 40 : 20, bottom: 56, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    ...(showLegend ? { legend: { top: 0, data: series.map((s) => s.label) } } : {}),
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: series.map((s, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length];
      return {
        name: s.label || config.title || 'Series',
        type: 'bar' as const,
        // A shared stack name piles a category's series into one bar.
        ...(config.stacked ? { stack: 'total' } : {}),
        itemStyle: { color },
        // A bar whose aggregated value falls outside an outlined band is bordered in the
        // crossed limit's colour (orange for min/max, red for concession); others stay plain.
        data: s.values.map((v) => {
          const border = v !== null ? outlineColor(v) : null;
          return border ? { value: v, itemStyle: outlierItemStyle(color, border) } : v;
        }),
        ...(i === 0 && marks.length > 0
          ? { markLine: { silent: true, symbol: 'none', data: marks } }
          : {}),
        ...(i === 0 && areas.length > 0 ? { markArea: { silent: true, data: areas } } : {}),
      };
    }),
  };
}

function aggregateLabel(aggregate: Aggregate): string {
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

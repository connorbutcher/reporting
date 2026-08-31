import type { EChartsCoreOption } from 'echarts/core';
import { DatasetColumn } from '../../../../../core/models/dataset';
import { Aggregate, BarChartWidgetConfig, readChartAxes, readChartBindings } from '../../../../../core/models/report';
import { BarChartQueryResult } from '../../../../../core/models/widget-query';
import { ChartColumns } from './chart-columns';
import { ChartFormat } from './chart-format';
import { ChartScale } from './chart-scale';
import { SeriesColors } from './series-colors';
import { ToleranceMarks } from './tolerance-marks';
import { ToleranceOutline } from './tolerance-outline';

/** Builds the bar echarts option: a category axis with one aggregated value per category, per series. */
export class BarOption {
  /** Null until there's a dataset and a category column bound. */
  public static build(
    config: BarChartWidgetConfig,
    data: BarChartQueryResult | null,
    columns: DatasetColumn[],
    colors: Map<string, string>,
  ): EChartsCoreOption | null {
    // A bar chart is single-binding; its one binding holds the category/value axes.
    const primary = readChartBindings(config)[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!categoryColumn) return null;

    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    const valueColumn = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    // A bar chart uses only the primary value axis; its label lives there.
    const valueLabel =
      readChartAxes(config)[0].label.trim() || valueColumn?.name || BarOption.aggregateLabel(config.aggregate);

    // A legend only earns its space once bars split into more than one series.
    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;

    // The value axis is whichever one isn't holding the categories, so reference lines and
    // fills land on the measure regardless of orientation.
    const valueAxisKey = () => (horizontal ? 'xAxis' : 'yAxis');
    const bands = data?.toleranceBands ?? [];
    const marks = ToleranceMarks.lines(bands, valueAxisKey);
    const areas = ToleranceMarks.areas(bands, valueAxisKey);
    const outlineColor = ToleranceOutline.forValue(bands);

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
      ...ChartScale.numericAxis(false, false, null, null, valueConfig),
      name: valueLabel,
      nameLocation: 'middle' as const,
      nameGap: horizontal ? 28 : 48,
    };

    return {
      grid: { left: 56, right: 20, top: showLegend ? 40 : 20, bottom: 56, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value: unknown) =>
          typeof value === 'number' ? ChartFormat.numeric(value, valueConfig) : String(value ?? ''),
      },
      ...(showLegend ? { legend: { top: 0, data: series.map((s) => s.label), type: 'scroll' } } : {}),
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: series.map((s, i) => {
        // A single-series bar chart honours the binding's colour override; a colour-by split
        // keeps its per-value palette colours.
        const override = series.length === 1 ? primary?.color : null;
        const color = override ?? SeriesColors.forSeries(colors, s.label, i);
        return {
          name: s.label || config.title || 'Series',
          type: 'bar' as const,
          // A shared stack name piles a category's series into one bar.
          ...(config.stacked ? { stack: 'total' } : {}),
          itemStyle: { color },
          // A bar outside an outlined band is bordered in the crossed limit's colour.
          data: s.values.map((v) => {
            const border = v !== null ? outlineColor(v) : null;
            return border ? { value: v, itemStyle: ToleranceOutline.itemStyle(color, border) } : v;
          }),
          ...(i === 0 && marks.length > 0
            ? { markLine: { silent: true, symbol: 'none', data: marks } }
            : {}),
          ...(i === 0 && areas.length > 0 ? { markArea: { silent: true, data: areas } } : {}),
        };
      }),
    };
  }

  private static aggregateLabel(aggregate: Aggregate): string {
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
}

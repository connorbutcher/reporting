import { DatasetColumn, NumericColumnConfig } from '../../../../../core/models/dataset';
import { Aggregate, BarChartWidgetConfig, readChartAxes, readChartBindings } from '../../../../../core/models/report';
import { BarChartQueryResult } from '../../../../../core/models/widget-query';
import { BarSeriesOption, ECOption, LabelCallbackParams } from './chart-option.types';
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
  ): ECOption | null {
    // The first bound binding names the shared category axis (its dataset's columns are `columns`),
    // matching how the widget host picks the schema; later bindings overlay their own bars.
    const bindings = readChartBindings(config);
    const primary = bindings.find((b) => b.datasetId) ?? bindings[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    if (!categoryColumn) return null;

    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    // Each series carries the binding it came from: its colour override applies only when the
    // binding contributes a single series, and stacking piles a binding's own series together.
    const bindingsById = new Map(bindings.map((b) => [b.id, b]));
    const seriesPerBinding = new Map<string, number>();
    for (const s of series) {
      if (s.bindingId) seriesPerBinding.set(s.bindingId, (seriesPerBinding.get(s.bindingId) ?? 0) + 1);
    }

    const valueColumn = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    const valueConfig = ChartFormat.numericConfig(valueColumn);
    const categoryLabel = config.xAxisLabel.trim() || categoryColumn.name;
    // A bar chart uses only the primary value axis; its label, interval, and rotation live there.
    const valueAxisConfig = readChartAxes(config)[0];
    const valueLabel =
      valueAxisConfig.label.trim() || valueColumn?.name || BarOption.aggregateLabel(config.aggregate);

    // A legend only earns its space once bars split into more than one series.
    const showLegend = series.length > 1 && config.showLegend;
    const horizontal = config.horizontal;
    const showGridLines = config.showGridLines ?? true;

    // The value axis is whichever one isn't holding the categories, so reference lines and
    // fills land on the measure regardless of orientation.
    const valueAxisKey = () => (horizontal ? 'xAxis' : 'yAxis');
    const bands = data?.toleranceBands ?? [];
    const marks = ToleranceMarks.lines(bands, valueAxisKey);
    const areas = ToleranceMarks.areas(bands, valueAxisKey);
    const outlineColor = ToleranceOutline.forValue(bands);

    // Categories sit on the X axis for vertical bars, the Y axis for horizontal ones; the value
    // axis takes whichever is left. Each name's gap is sized for its labels *on that axis*.
    const categoryOrientation = horizontal ? 'y' : 'x';
    const valueOrientation = horizontal ? 'x' : 'y';

    // Long vertical-bar category lists overlap, so auto-tilt them once there are a few — unless
    // the user has picked an explicit orientation, which always wins.
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
      null,
      null,
      valueAxisConfig.interval,
      valueConfig,
      valueAxisConfig.scale,
    );
    const valueRotate = ChartScale.labelRotate(valueAxisConfig.rotate);
    const valueLen = BarOption.valueLabelLen(series, valueConfig);
    const valueAxis = {
      ...valueScale,
      ...(valueRotate !== 0 ? { axisLabel: { ...valueScale.axisLabel, rotate: valueRotate } } : {}),
      name: valueLabel,
      nameLocation: 'middle' as const,
      nameGap: ChartScale.nameGap(valueLen, valueRotate, valueOrientation),
      // Gridlines run across the value axis (the measure); the category axis never draws them.
      splitLine: { show: showGridLines },
    };

    return {
      grid: { left: 56, right: 20, top: showLegend ? 40 : 20, bottom: 56, containLabel: true, outerBoundsContain: 'all' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value: unknown) =>
          typeof value === 'number' ? ChartFormat.numeric(value, valueConfig) : String(value ?? ''),
      },
      ...(showLegend ? { legend: { top: 0, data: series.map((s) => s.label), type: 'scroll' } } : {}),
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: series.map((s, i): BarSeriesOption => {
        // A binding's colour override applies only when it yields a single series; once it splits
        // (several measures or a colour-by column) each series keeps its own palette colour.
        const binding = s.bindingId ? bindingsById.get(s.bindingId) : undefined;
        const single = (s.bindingId ? (seriesPerBinding.get(s.bindingId) ?? 1) : series.length) === 1;
        const override = single ? (binding?.color ?? null) : null;
        const color = override ?? SeriesColors.forSeries(colors, s.label, i);
        return {
          name: s.label || config.title || 'Series',
          type: 'bar',
          // Stacking piles each binding's own series into one column, so several overlaid
          // datasets stand as side-by-side stacks rather than all collapsing into one.
          ...(config.stacked ? { stack: s.bindingId ?? 'total' } : {}),
          itemStyle: { color },
          ...(config.showValueLabels
            ? {
                label: {
                  show: true,
                  position: horizontal ? 'right' : 'top',
                  formatter: (p: LabelCallbackParams) =>
                    typeof p.value === 'number' ? ChartFormat.numeric(p.value, valueConfig) : '',
                },
              }
            : {}),
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

  /**
   * The longest formatted value label, in characters, from the bars' data extent (min & max) —
   * enough to size a non-overlapping {@link ChartScale.nameGap} for the value axis.
   */
  private static valueLabelLen(
    series: readonly { values: readonly (number | null)[] }[],
    config: NumericColumnConfig | undefined,
  ): number {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (const v of s.values) {
        if (typeof v === 'number') {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (!Number.isFinite(min)) return 0;
    return Math.max(ChartFormat.numeric(min, config).length, ChartFormat.numeric(max, config).length);
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

import { DatasetColumn, NumericColumnConfig } from '../../../../../../core/models/dataset';
import {
  ControlChartMode,
  XBarRChartWidgetConfig,
  readChartAxes,
  readChartBindings,
} from '../../../../../../core/models/report';
import { XBarRChartQueryResult } from '../../../../../../core/models/widget-query';
import { CategoryZoom } from '../axes/category-zoom';
import { ChartColumns } from '../format/chart-columns';
import { ChartFormat } from '../format/chart-format';
import { ControlChartNaming } from './control-chart-naming';
import { XBarRChart } from './xbar-r-chart';

/** Resolves a control chart's config and data into an {@link XBarRChart}. */
export class XBarRChartResolver {
  /** Null until there's a dataset and both a subgroup and a value column bound. */
  public static resolve(
    config: XBarRChartWidgetConfig,
    data: XBarRChartQueryResult | null,
    columns: DatasetColumn[],
  ): XBarRChart | null {
    const primary = readChartBindings(config)[0];
    const categoryColumn = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const valueColumn = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    if (!categoryColumn || !valueColumn) {
      return null;
    }

    const categories = data?.categories ?? [];
    const mode = data?.mode ?? config.mode ?? 'xBarR';
    const attribute = mode === 'p' || mode === 'np';
    const valueConfig = attribute ? undefined : ChartFormat.numericConfig(valueColumn);

    return {
      config,
      data,
      categoryColumn,
      valueColumn,
      categories,
      subgroups: data?.subgroups ?? [],
      mode,
      names: ControlChartNaming.of(mode),
      attribute,
      valueConfig,
      formatMean: XBarRChartResolver.meanFormat(mode, valueConfig),
      meanAxisConfig: readChartAxes(config)[0],
      highlight: config.highlightOutOfControl ?? true,
      zoom: CategoryZoom.enabled(config.zoom, categories.length),
    };
  }

  private static meanFormat(
    mode: ControlChartMode,
    valueConfig: NumericColumnConfig | undefined,
  ): (value: number) => string {
    return mode === 'p'
      ? (v: number) => `${ChartFormat.numeric(v * 100, { kind: 'numeric', decimals: 1 })}%`
      : (v: number) => ChartFormat.numeric(v, valueConfig);
  }
}

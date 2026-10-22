import {
  ChartSeriesBinding,
  ChartWidgetConfig,
  ChartConfigs,
} from '../../../../../core/models/report';

/**
 * Only the config the server query depends on, so appearance-only edits don't trigger a reload
 * that would dim the chart.
 */
export class ChartQueryKey {
  public static of(config: ChartWidgetConfig): string {
    const grouping = config.type === 'barChart' || config.type === 'comboChart';
    return JSON.stringify({
      bindings: ChartConfigs.bindings(config).map((b) => ChartQueryKey.binding(b)),
      trend: config.showTrendLine ?? false,
      aggregate: grouping ? config.aggregate : null,
      barSort: grouping ? config.sort : null,
      box: ChartQueryKey.box(config),
      hist: ChartQueryKey.histogram(config),
      grouping: 'categoryGrouping' in config ? (config.categoryGrouping ?? null) : null,
      line: ChartQueryKey.line(config),
      control: ChartQueryKey.control(config),
      tol: config.toleranceBands,
      tip: config.tooltipColumns,
    });
  }

  /** Grouping charts ignore draw order server-side, so including it is harmless. */
  private static binding(b: ChartSeriesBinding): unknown[] {
    return [
      b.datasetId,
      b.xColumnId,
      b.yColumnId,
      b.valueColumnIds ?? null,
      b.seriesColumnId,
      b.sizeColumnId ?? null,
      b.sort ?? null,
    ];
  }

  /** Mean, n, capability and highlighting are render-only. */
  private static box(config: ChartWidgetConfig): object | null {
    if (config.type !== 'boxPlot') {
      return null;
    }
    return { w: config.whisker, f: config.whiskerFactor, s: config.sort, p: config.showPoints };
  }

  /** Every binning option changes the response. */
  private static histogram(config: ChartWidgetConfig): object | null {
    if (config.type !== 'histogram') {
      return null;
    }
    return {
      m: config.binMode,
      c: config.binCount,
      w: config.binWidth,
      lo: config.rangeMin,
      hi: config.rangeMax,
      n: config.normalize,
      cu: config.cumulative,
    };
  }

  private static line(config: ChartWidgetConfig): object | null {
    if (config.type !== 'lineChart') {
      return null;
    }
    return { a: config.aggregate ?? null, g: config.xGrouping ?? null };
  }

  private static control(config: ChartWidgetConfig): object | null {
    if (config.type !== 'xbarRChart') {
      return null;
    }
    return {
      s: config.sort,
      m: config.mode ?? 'xBarR',
      b: config.baselineSubgroups ?? null,
      r: config.runRules ?? false,
    };
  }
}

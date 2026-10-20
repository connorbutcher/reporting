import { DatasetColumn } from '../../../../core/models/dataset';
import { ChartWidgetConfig, readChartBindings } from '../../../../core/models/report';
import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  ChartQueryResult,
  HistogramQueryResult,
  XBarRChartQueryResult,
} from '../../../../core/models/widget-query';
import { toCsv } from '../csv.util';
import { ChartColumns } from './options/chart-columns';
import { ChartFormat } from './options/chart-format';
import { XBarROption } from './options/xbar-r-option';

type AnyChartResult =
  | ChartQueryResult
  | BarChartQueryResult
  | BoxPlotQueryResult
  | HistogramQueryResult
  | XBarRChartQueryResult;

/** A chart's plotted values as a table: a header row, then one row per point, category, box, bin or subgroup. */
export type ChartTable = (string | number | boolean)[][];

/**
 * The rows plotted behind a chart, shaped per chart kind — exported as CSV, and shown as the
 * chart's "View data" table so the values are reachable without a mouse.
 */
export class ChartExport {
  public static csv(
    config: ChartWidgetConfig,
    data: AnyChartResult,
    columns: DatasetColumn[],
  ): string {
    return toCsv(ChartExport.table(config, data, columns));
  }

  public static table(
    config: ChartWidgetConfig,
    data: AnyChartResult,
    columns: DatasetColumn[],
  ): ChartTable {
    if (config.type === 'barChart' || config.type === 'comboChart') {
      // A combo chart's data is the bar result (one value per category per series), so its table is
      // the same category × series grid regardless of which series draw as bars or lines.
      return ChartExport.barTable(data as BarChartQueryResult);
    }
    if (config.type === 'boxPlot') return ChartExport.boxTable(data as BoxPlotQueryResult);
    if (config.type === 'histogram')
      return ChartExport.histogramTable(data as HistogramQueryResult);
    if (config.type === 'xbarRChart') return ChartExport.xBarRTable(data as XBarRChartQueryResult);

    // Date axes carry epoch-millis, so pass the axis columns to render readable dates.
    const primary = readChartBindings(config).find((b) => b.datasetId);
    const x = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const y = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    return ChartExport.pointTable(data as ChartQueryResult, x, y);
  }

  /** One row per point, with a Series column once there's more than one and a Size column when any point has a bubble size. */
  private static pointTable(
    data: ChartQueryResult,
    xColumn: DatasetColumn | null,
    yColumn: DatasetColumn | null,
  ): ChartTable {
    const multi = data.series.length > 1;
    const hasSize = data.series.some((s) => s.points.some((p) => typeof p.size === 'number'));
    const rows: ChartTable = [
      [...(multi ? ['Series'] : []), 'X', 'Y', ...(hasSize ? ['Size'] : [])],
    ];
    for (const series of data.series) {
      for (const point of series.points) {
        rows.push([
          ...(multi ? [series.label] : []),
          ChartExport.axisCell(point.x, xColumn),
          ChartExport.axisCell(point.y, yColumn),
          ...(hasSize ? [point.size ?? ''] : []),
        ]);
      }
    }
    return rows;
  }

  /** One row per category, one column per series. */
  private static barTable(data: BarChartQueryResult): ChartTable {
    const rows: ChartTable = [['Category', ...data.series.map((s) => s.label || 'Value')]];
    data.categories.forEach((category, i) => {
      rows.push([category, ...data.series.map((s) => s.values[i] ?? '')]);
    });
    return rows;
  }

  /** One row per box: its category, series (when split), five-number summary, and row count. */
  private static boxTable(data: BoxPlotQueryResult): ChartTable {
    const multi = data.series.length > 1;
    const rows: ChartTable = [
      [...(multi ? ['Series'] : []), 'Category', 'Min', 'Q1', 'Median', 'Q3', 'Max', 'N'],
    ];
    for (const series of data.series) {
      series.boxes.forEach((box, i) => {
        if (!box) return;
        rows.push([
          ...(multi ? [series.label] : []),
          data.categories[i],
          box.min,
          box.q1,
          box.median,
          box.q3,
          box.max,
          box.count,
        ]);
      });
    }
    return rows;
  }

  /**
   * One row per subgroup (or point): its value and spread, their control limits, and whether each
   * breached them — named for the chart's mode. An attribute chart (p, np) has no spread columns.
   */
  private static xBarRTable(data: XBarRChartQueryResult): ChartTable {
    const mode = data.mode ?? 'xBarR';
    const names = XBarROption.names(mode);
    const attribute = mode === 'p' || mode === 'np';
    const rows: ChartTable = [
      [
        'Subgroup',
        'N',
        names.value,
        `${names.meanChart} UCL`,
        `${names.meanChart} LCL`,
        `${names.value} out of control`,
        ...(attribute
          ? []
          : [
              names.dispersion,
              `${names.dispersionChart} UCL`,
              `${names.dispersionChart} LCL`,
              `${names.dispersion} out of control`,
            ]),
      ],
    ];
    data.categories.forEach((category, i) => {
      const s = data.subgroups[i];
      rows.push([
        category,
        s.count,
        s.mean,
        s.xBarUcl,
        s.xBarLcl,
        s.meanOutOfControl,
        ...(attribute
          ? []
          : [s.hasRange === false ? '' : s.range, s.rUcl, s.rLcl, s.rangeOutOfControl]),
      ]);
    });
    return rows;
  }

  /** One row per bin: its label and edges, then each series' height. */
  private static histogramTable(data: HistogramQueryResult): ChartTable {
    const multi = data.series.length > 1;
    const rows: ChartTable = [
      [
        'Bin',
        'Lower',
        'Upper',
        ...(multi ? data.series.map((s) => s.label || 'Value') : ['Value']),
      ],
    ];
    data.bins.forEach((bin, i) => {
      rows.push([bin.label, bin.lower, bin.upper, ...data.series.map((s) => s.values[i] ?? '')]);
    });
    return rows;
  }

  /** A date column's millis rendered as its date pattern, else the raw value. */
  private static axisCell(value: unknown, column: DatasetColumn | null): string | number {
    if (column?.type === 'dateTime' && typeof value === 'number') {
      return ChartFormat.date(value, ChartFormat.dateConfig(column));
    }
    return typeof value === 'number' ? value : String(value ?? '');
  }
}

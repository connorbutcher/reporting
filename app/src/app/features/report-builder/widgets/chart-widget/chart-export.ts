import { DatasetColumn } from '../../../../core/models/dataset';
import { ChartWidgetConfig, readChartBindings } from '../../../../core/models/report';
import {
  BarChartQueryResult,
  BoxPlotQueryResult,
  ChartQueryResult,
  HistogramQueryResult,
} from '../../../../core/models/widget-query';
import { csvCell } from '../csv.util';
import { ChartColumns } from './options/chart-columns';
import { ChartFormat } from './options/chart-format';

/** Builds the CSV text for the rows plotted behind a chart, shaped per chart kind. */
export class ChartExport {
  public static csv(
    config: ChartWidgetConfig,
    data: ChartQueryResult | BarChartQueryResult | BoxPlotQueryResult | HistogramQueryResult,
    columns: DatasetColumn[],
  ): string {
    if (config.type === 'barChart' || config.type === 'comboChart') {
      // A combo chart's data is the bar result (one value per category per series), so its CSV is
      // the same category × series grid regardless of which series draw as bars or lines.
      return ChartExport.barCsv(data as BarChartQueryResult);
    }
    if (config.type === 'boxPlot') return ChartExport.boxCsv(data as BoxPlotQueryResult);
    if (config.type === 'histogram') return ChartExport.histogramCsv(data as HistogramQueryResult);

    // Date axes carry epoch-millis, so pass the axis columns to render readable dates.
    const primary = readChartBindings(config).find((b) => b.datasetId);
    const x = ChartColumns.byId(columns, primary?.xColumnId ?? null);
    const y = ChartColumns.byId(columns, primary?.yColumnId ?? null);
    return ChartExport.pointCsv(data as ChartQueryResult, x, y);
  }

  /** One row per point, with a Series column once there's more than one. */
  private static pointCsv(
    data: ChartQueryResult,
    xColumn: DatasetColumn | null,
    yColumn: DatasetColumn | null,
  ): string {
    const multi = data.series.length > 1;
    const rows = [[...(multi ? ['Series'] : []), 'X', 'Y'].join(',')];
    for (const series of data.series) {
      for (const point of series.points) {
        rows.push(
          [
            ...(multi ? [csvCell(series.label)] : []),
            ChartExport.csvAxisCell(point.x, xColumn),
            ChartExport.csvAxisCell(point.y, yColumn),
          ].join(','),
        );
      }
    }
    return rows.join('\n');
  }

  /** One row per category, one column per series. */
  private static barCsv(data: BarChartQueryResult): string {
    const rows = [['Category', ...data.series.map((s) => s.label || 'Value')].map(csvCell).join(',')];
    data.categories.forEach((category, i) => {
      rows.push([csvCell(category), ...data.series.map((s) => csvCell(s.values[i] ?? ''))].join(','));
    });
    return rows.join('\n');
  }

  /** One row per box: its category, series (when split), five-number summary, and row count. */
  private static boxCsv(data: BoxPlotQueryResult): string {
    const multi = data.series.length > 1;
    const header = [...(multi ? ['Series'] : []), 'Category', 'Min', 'Q1', 'Median', 'Q3', 'Max', 'N'];
    const rows = [header.map(csvCell).join(',')];
    for (const series of data.series) {
      series.boxes.forEach((box, i) => {
        if (!box) return;
        rows.push(
          [
            ...(multi ? [csvCell(series.label)] : []),
            csvCell(data.categories[i]),
            box.min,
            box.q1,
            box.median,
            box.q3,
            box.max,
            box.count,
          ].join(','),
        );
      });
    }
    return rows.join('\n');
  }

  /** One row per bin: its range bounds, then one value column per series. */
  private static histogramCsv(data: HistogramQueryResult): string {
    const multi = data.series.length > 1;
    const header = ['Bin', 'Lower', 'Upper', ...(multi ? data.series.map((s) => s.label || 'Value') : ['Value'])];
    const rows = [header.map(csvCell).join(',')];
    data.bins.forEach((bin, i) => {
      rows.push(
        [
          csvCell(bin.label),
          bin.lower,
          bin.upper,
          ...data.series.map((s) => csvCell(s.values[i] ?? '')),
        ].join(','),
      );
    });
    return rows.join('\n');
  }

  /** A date column's millis rendered as its date pattern, else the raw value. */
  private static csvAxisCell(value: unknown, column: DatasetColumn | null): string {
    if (column?.type === 'dateTime' && typeof value === 'number') {
      return csvCell(ChartFormat.date(value, ChartFormat.dateConfig(column)));
    }
    return csvCell(value);
  }
}

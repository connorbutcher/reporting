import { DatasetColumn } from '../../../../core/models/dataset';
import { ChartWidgetConfig, readChartBindings } from '../../../../core/models/report';
import { BarChartQueryResult, ChartQueryResult } from '../../../../core/models/widget-query';
import { ChartColumns } from './options/chart-columns';
import { ChartFormat } from './options/chart-format';

/** Saves a chart as a PNG image or the plotted rows as CSV. */
export class ChartExport {
  public static png(instance: { getDataURL(opts?: object): string }, name: string): void {
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    ChartExport.download(url, `${name}.png`);
  }

  public static csv(
    config: ChartWidgetConfig,
    data: ChartQueryResult | BarChartQueryResult,
    columns: DatasetColumn[],
    name: string,
  ): void {
    let csv: string;
    if (config.type === 'barChart') {
      csv = ChartExport.barCsv(data as BarChartQueryResult);
    } else {
      // Date axes carry epoch-millis, so pass the axis columns to render readable dates.
      const primary = readChartBindings(config).find((b) => b.datasetId);
      const x = ChartColumns.byId(columns, primary?.xColumnId ?? null);
      const y = ChartColumns.byId(columns, primary?.yColumnId ?? null);
      csv = ChartExport.pointCsv(data as ChartQueryResult, x, y);
    }
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    ChartExport.download(url, `${name}.csv`);
    // Give the click a beat to start before releasing the object URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Clicks a transient anchor to save `url` under `filename`, then discards it. */
  private static download(url: string, filename: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
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
            ...(multi ? [ChartExport.csvCell(series.label)] : []),
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
    const rows = [['Category', ...data.series.map((s) => s.label || 'Value')].map(ChartExport.csvCell).join(',')];
    data.categories.forEach((category, i) => {
      rows.push([ChartExport.csvCell(category), ...data.series.map((s) => ChartExport.csvCell(s.values[i] ?? ''))].join(','));
    });
    return rows.join('\n');
  }

  /** A CSV cell, quoted and escaped only when it contains a comma, quote, or newline. */
  private static csvCell(value: unknown): string {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  /** A date column's millis rendered as its date pattern, else the raw value. */
  private static csvAxisCell(value: unknown, column: DatasetColumn | null): string {
    if (column?.type === 'dateTime' && typeof value === 'number') {
      return ChartExport.csvCell(ChartFormat.date(value, ChartFormat.dateConfig(column)));
    }
    return ChartExport.csvCell(value);
  }
}

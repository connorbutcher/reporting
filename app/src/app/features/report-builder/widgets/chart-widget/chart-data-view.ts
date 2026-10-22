import { DatasetColumn } from '../../../../core/models/dataset';
import { ChartWidgetConfig } from '../../../../core/models/report';
import { WidgetDataTable } from '../widget-data-dialog/widget-data-table';
import { ChartExport } from './chart-export';
import { AnyChartResult } from './models/any-chart-result';

/** A chart's values for the "View data" dialog. */
export class ChartDataView {
  /** Keeps a large point chart's table responsive. */
  private static readonly ROW_LIMIT = 500;

  public static build(
    config: ChartWidgetConfig,
    data: AnyChartResult,
    columns: DatasetColumn[],
  ): WidgetDataTable {
    const [header = [], ...rows] = ChartExport.table(config, data, columns);
    return {
      header: header.map((cell) => ChartDataView.cellText(cell)),
      rows: rows
        .slice(0, ChartDataView.ROW_LIMIT)
        .map((row) => row.map((cell) => ChartDataView.cellText(cell))),
      hidden: Math.max(0, rows.length - ChartDataView.ROW_LIMIT),
    };
  }

  public static cellText(cell: string | number | boolean): string {
    if (typeof cell === 'number') {
      return cell.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
    if (typeof cell === 'boolean') {
      return cell ? 'Yes' : 'No';
    }
    return cell;
  }
}

import { TableCell } from '../../../core/models/widget-query';

/** Builds CSV text for widget exports. */
export class Csv {
  /** A CSV cell, quoted and escaped only when it contains a comma, quote, or line break. */
  public static cell(value: unknown): string {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  /** Rows of raw values joined into a CSV body, each cell escaped. */
  public static fromRows(rows: readonly (readonly unknown[])[]): string {
    return rows.map((row) => row.map(Csv.cell).join(',')).join('\n');
  }

  /**
   * A cell's value for a CSV: numbers as plain numbers, dates as `yyyy-MM-dd HH:mm:ss` (or just the day
   * at midnight), which spreadsheets read as dates, and anything else as its displayed text.
   */
  public static fromTableCell(cell: TableCell | undefined): unknown {
    const value = cell?.value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      const [day, time] = value.slice(0, 19).split('T');
      return time === '00:00:00' ? day : `${day} ${time}`;
    }
    return cell?.displayValue ?? '';
  }
}

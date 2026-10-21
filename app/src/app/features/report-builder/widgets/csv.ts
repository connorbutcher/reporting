import { TableCell } from '../../../core/models/widget-query';

export class Csv {
  /** Quoted only when it contains a comma, quote or line break. */
  public static cell(value: unknown): string {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  public static fromRows(rows: readonly (readonly unknown[])[]): string {
    return rows.map((row) => row.map(Csv.cell).join(',')).join('\n');
  }

  /** Numbers as numbers, dates as `yyyy-MM-dd HH:mm:ss` so spreadsheets read them, else display text. */
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

import { formatDate } from '@angular/common';
import { DatasetColumn, DateColumnConfig, NumericColumnConfig } from '../../../../../core/models/dataset';

const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';

/**
 * Number/date formatting that mirrors the server's CellFormatter, so axis ticks and
 * tooltips read the same as the dataset's table cells.
 */
export class ChartFormat {
  public static numericConfig(
    column: DatasetColumn | null | undefined,
  ): NumericColumnConfig | undefined {
    return column?.configuration.kind === 'numeric' ? column.configuration : undefined;
  }

  public static dateConfig(column: DatasetColumn | null | undefined): DateColumnConfig | undefined {
    return column?.configuration.kind === 'date' ? column.configuration : undefined;
  }

  public static numeric(value: number, config?: NumericColumnConfig): string {
    const useGrouping = config?.useGrouping !== false;
    const options: Intl.NumberFormatOptions =
      config?.decimals != null && config.decimals >= 0
        ? { useGrouping, minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals }
        : { useGrouping, maximumFractionDigits: 3 };
    const formatted = new Intl.NumberFormat('en-US', options).format(value);
    return `${config?.prefix ?? ''}${formatted}${config?.suffix ?? ''}`;
  }

  /**
   * Formats an epoch-millisecond timestamp in **UTC** — the server encodes a date cell as
   * its wall-clock instant taken as UTC millis, so the viewer's local zone would shift a
   * date-only value by up to a day. Pair with echarts' `useUTC`.
   */
  public static date(millis: number, config?: DateColumnConfig): string {
    const pattern = config?.dateFormat || DEFAULT_DATE_FORMAT;
    try {
      return formatDate(millis, pattern, 'en-US', 'UTC');
    } catch {
      // A bad custom pattern shouldn't blank the tick/tooltip.
      return formatDate(millis, DEFAULT_DATE_FORMAT, 'en-US', 'UTC');
    }
  }
}

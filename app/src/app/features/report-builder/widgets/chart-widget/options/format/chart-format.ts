import { formatDate } from '@angular/common';
import {
  DatasetColumn,
  DateColumnConfig,
  NumericColumnConfig,
} from '../../../../../../core/models/dataset';

/** Mirrors the server's CellFormatter so ticks and tooltips match the table cells. */
export class ChartFormat {
  private static readonly DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';

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
        ? {
            useGrouping,
            minimumFractionDigits: config.decimals,
            maximumFractionDigits: config.decimals,
          }
        : { useGrouping, maximumFractionDigits: 3 };
    const formatted = new Intl.NumberFormat('en-US', options).format(value);
    return `${config?.prefix ?? ''}${formatted}${config?.suffix ?? ''}`;
  }

  /** Formats in UTC, since the server encodes dates as wall-clock time in UTC millis. Pair with `useUTC`. */
  public static date(millis: number, config?: DateColumnConfig): string {
    const pattern = config?.dateFormat || ChartFormat.DEFAULT_DATE_FORMAT;
    try {
      return formatDate(millis, pattern, 'en-US', 'UTC');
    } catch {
      // A bad custom pattern shouldn't blank the label.
      return formatDate(millis, ChartFormat.DEFAULT_DATE_FORMAT, 'en-US', 'UTC');
    }
  }
}
